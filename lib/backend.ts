import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  createSessionToken,
  getSessionExpiry,
  hashPassword,
  hashSessionToken,
  normalizeEmail,
  normalizeUsername,
  SESSION_COOKIE_NAME,
  verifyPassword
} from "@/lib/auth";

export type CurrentUser = {
  id: number;
  username: string;
  email: string;
  isAdmin?: boolean;
};

function parseJsonArray(value: string | null | undefined): number[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map((item) => Number(item)).filter((item) => Number.isFinite(item)) : [];
  } catch {
    return [];
  }
}

function stringifyJsonArray(values: number[]) {
  return JSON.stringify([...new Set(values)]);
}

// Presence is tracked separately so the app can show who is active without scanning sessions.
function touchPresence(userId: number) {
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO user_presence (user_id, last_seen, status)
    VALUES (?, ?, 'online')
    ON CONFLICT(user_id) DO UPDATE SET last_seen = ?, status = 'online'
  `).run(userId, now, now);
}

function assertNoBlock(firstUserId: number, secondUserId: number) {
  const blocked = db.prepare(`
    SELECT 1 FROM blocks WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?) LIMIT 1
  `).get(firstUserId, secondUserId, secondUserId, firstUserId);
  if (blocked) throw new Error("BLOCKED");
}

export function unauthorizedResponse() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export function badRequestResponse(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function conflictResponse(message: string) {
  return NextResponse.json({ error: message }, { status: 409 });
}

export function notFoundResponse(message = "Not found") {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function internalErrorResponse(message = "Something went wrong") {
  return NextResponse.json({ error: message }, { status: 500 });
}

export function forbiddenResponse(message = "Forbidden") {
  return NextResponse.json({ error: message }, { status: 403 });
}

export function requireSameOrigin(request: Request) {
  const requestOrigin = request.headers.get("origin");
  const requestUrl = new URL(request.url);
  
  // For Railway and other proxied environments, prioritize x-forwarded headers
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const host = request.headers.get("host");

  // Determine the actual origin the request came from
  let expectedOrigin: string;
  
  if (forwardedHost && forwardedProto) {
    // Railway and other proxies set these headers
    expectedOrigin = `${forwardedProto}://${forwardedHost}`;
  } else {
    // Fallback to host header and request URL protocol
    const actualHost = host || requestUrl.hostname;
    const actualProto = forwardedProto || requestUrl.protocol.replace(":", "");
    expectedOrigin = `${actualProto}://${actualHost}`;
  }

  if (!requestOrigin) {
    // Allow requests without origin header (some clients don't send it)
    return null;
  }

  try {
    const incomingOrigin = new URL(requestOrigin).origin;
    if (incomingOrigin !== expectedOrigin) {
      console.warn(`[CORS] Origin mismatch: got ${incomingOrigin}, expected ${expectedOrigin}`);
      return forbiddenResponse();
    }
  } catch (err) {
    console.warn(`[CORS] Invalid origin header: ${requestOrigin}`, err);
    return forbiddenResponse();
  }

  return null;
}

export function attachSessionCookie(response: NextResponse, token: string) {
  // In production (including Railway), cookies must be secure (HTTPS)
  // Railway handles HTTPS externally and sets x-forwarded-proto header
  const isSecure = process.env.NODE_ENV === "production";
  
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isSecure,
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });
  
  console.log(`[SESSION] Cookie set with secure=${isSecure}, NODE_ENV=${process.env.NODE_ENV}`);
  
  return response;
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  
  if (!token) {
    console.log("[AUTH] No session token found in cookies");
    return null;
  }

  const tokenHash = hashSessionToken(token);
  const session = db.prepare(`
    SELECT session_id, user_id, expires_at FROM sessions WHERE token_hash = ?
  `).get(tokenHash) as any;

  if (!session) {
    console.log("[AUTH] Session not found in database for token hash");
    return null;
  }

  const expiresAt = new Date(session.expires_at);
  const now = new Date();
  
  if (expiresAt <= now) {
    console.log("[AUTH] Session expired");
    return null;
  }

  const user = db.prepare(`SELECT user_id, username, user_email as email, is_admin FROM "User" WHERE user_id = ?`).get(session.user_id) as any;
  
  if (!user) {
    console.log("[AUTH] User not found for session");
    return null;
  }

  touchPresence(session.user_id);
  console.log("[AUTH] User authenticated:", user.username);
  
  return { id: user.user_id, username: user.username, email: user.email, isAdmin: user.is_admin === 1 };
}
export function isAdmin(user: CurrentUser | null): boolean {
  return user?.isAdmin === true;
}

export async function createAdminUser(input: { username: string; email: string; password: string }) {
  const username = normalizeUsername(input.username);
  const email = normalizeEmail(input.email);

  const existing = db.prepare(`SELECT user_id FROM "User" WHERE username = ? OR user_email = ? LIMIT 1`).get(username, email);
  if (existing) throw new Error("USER_EXISTS");

  const passwordHash = await hashPassword(input.password);
  const now = new Date().toISOString();

  const user = db.prepare(`
    INSERT INTO "User" (username, user_email, user_password, is_admin)
    VALUES (?, ?, ?, 1)
    RETURNING user_id, username, user_email as email
  `).get(username, email, passwordHash) as any;

  db.prepare(`INSERT INTO user_profile (user_id) VALUES (?)`).run(user.user_id);
  db.prepare(`INSERT INTO user_presence (user_id, last_seen, status) VALUES (?, ?, 'online')`).run(user.user_id, now);

  const token = createSessionToken();
  db.prepare(`
    INSERT INTO sessions (user_id, token_hash, expires_at)
    VALUES (?, ?, ?)
  `).run(user.user_id, hashSessionToken(token), getSessionExpiry().toISOString());

  const profile = { bio: null, header_img: null, profile_img: null };

  return {
    user: { id: user.user_id, username: user.username, email: user.email, isAdmin: true, profile },
    token
  };
}
export async function registerUser(input: { username: string; email: string; password: string }) {
  const username = normalizeUsername(input.username);
  const email = normalizeEmail(input.email);

  const existing = db.prepare(`SELECT user_id FROM "User" WHERE username = ? OR user_email = ? LIMIT 1`).get(username, email);
  if (existing) throw new Error("USER_EXISTS");

  const passwordHash = await hashPassword(input.password);
  const now = new Date().toISOString();

  const user = db.prepare(`
    INSERT INTO "User" (username, user_email, user_password)
    VALUES (?, ?, ?)
    RETURNING user_id, username, user_email as email
  `).get(username, email, passwordHash) as any;

  db.prepare(`INSERT INTO user_profile (user_id) VALUES (?)`).run(user.user_id);
  db.prepare(`INSERT INTO user_presence (user_id, last_seen, status) VALUES (?, ?, 'online')`).run(user.user_id, now);

  const token = createSessionToken();
  db.prepare(`
    INSERT INTO sessions (user_id, token_hash, expires_at)
    VALUES (?, ?, ?)
  `).run(user.user_id, hashSessionToken(token), getSessionExpiry().toISOString());

  const profile = { bio: null, header_img: null, profile_img: null };

  return {
    user: { id: user.user_id, username: user.username, email: user.email, profile },
    token
  };
}

export async function loginUser(input: { identifier: string; password: string }) {
  const normalized = input.identifier.trim().toLowerCase();
  const user = db.prepare(`
    SELECT user_id, username, user_email, user_password FROM "User" WHERE username = ? OR user_email = ?
  `).get(normalized, normalized) as any;

  if (!user) throw new Error("INVALID_LOGIN");

  const valid = await verifyPassword(user.user_password, input.password);
  if (!valid) throw new Error("INVALID_LOGIN");

  const token = createSessionToken();
  db.prepare(`
    INSERT INTO sessions (user_id, token_hash, expires_at)
    VALUES (?, ?, ?)
  `).run(user.user_id, hashSessionToken(token), getSessionExpiry().toISOString());

  touchPresence(user.user_id);

  return {
    token,
    user: { id: user.user_id, username: user.username, email: user.user_email }
  };
}

export async function logoutUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    db.prepare(`DELETE FROM sessions WHERE token_hash = ?`).run(hashSessionToken(token));
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });
  response.cookies.set("lastterm_csrf", "", {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });
  return response;
}

export function updateProfile(
  userId: number,
  input: {
    username?: string;
    bio?: string;
    headerImageId?: number | null;
    profileImageId?: number | null;
    headerImageX?: number;
    headerImageY?: number;
    headerImageScale?: number;
  }
) {
  const user = db.prepare(`SELECT user_id, username FROM "User" WHERE user_id = ?`).get(userId) as any;
  if (!user) throw new Error("NOT_FOUND");

  if (input.username !== undefined) {
    const normalized = normalizeUsername(input.username);
    const duplicate = db.prepare(`SELECT user_id FROM "User" WHERE username = ? AND user_id != ? LIMIT 1`).get(normalized, userId);
    if (duplicate) throw new Error("USERNAME_TAKEN");
    db.prepare(`UPDATE "User" SET username = ? WHERE user_id = ?`).run(normalized, userId);
  }

  if (input.bio !== undefined) {
    db.prepare(`UPDATE user_profile SET bio = ? WHERE user_id = ?`).run(input.bio, userId);
  }
  if (input.headerImageId !== undefined) {
    db.prepare(`UPDATE user_profile SET header_img = ? WHERE user_id = ?`).run(input.headerImageId, userId);
  }
  if (input.profileImageId !== undefined) {
    db.prepare(`UPDATE user_profile SET profile_img = ? WHERE user_id = ?`).run(input.profileImageId, userId);
  }
  if (input.headerImageX !== undefined) {
    db.prepare(`UPDATE user_profile SET header_img_x = ? WHERE user_id = ?`).run(input.headerImageX, userId);
  }
  if (input.headerImageY !== undefined) {
    db.prepare(`UPDATE user_profile SET header_img_y = ? WHERE user_id = ?`).run(input.headerImageY, userId);
  }
  if (input.headerImageScale !== undefined) {
    db.prepare(`UPDATE user_profile SET header_img_scale = ? WHERE user_id = ?`).run(input.headerImageScale, userId);
  }

  const profile = db.prepare(`SELECT bio, header_img, profile_img, header_img_x, header_img_y, header_img_scale FROM user_profile WHERE user_id = ?`).get(userId) as any;
  return {
    id: user.user_id,
    username: input.username !== undefined ? normalizeUsername(input.username) : user.username,
    profile: profile ?? { bio: null, header_img: null, profile_img: null, header_img_x: 0, header_img_y: 0, header_img_scale: 1 }
  };
}

export async function changePassword(userId: number, currentPassword: string, newPassword: string) {
  const user = db.prepare(`SELECT user_password FROM "User" WHERE user_id = ?`).get(userId) as any;
  if (!user) throw new Error("NOT_FOUND");

  const valid = await verifyPassword(user.user_password, currentPassword);
  if (!valid) throw new Error("INVALID_PASSWORD");

  const newHash = await hashPassword(newPassword);
  db.prepare(`UPDATE "User" SET user_password = ? WHERE user_id = ?`).run(newHash, userId);
  db.prepare(`DELETE FROM sessions WHERE user_id = ?`).run(userId);
}

export function markUserOnline(userId: number) {
  touchPresence(userId);
}

export function listOnlineUsers() {
  const cutoff = new Date(Date.now() - 90000).toISOString();
  const users = db
    .prepare(`
      SELECT u.user_id, u.username, u.user_email, p.last_seen, p.status
      FROM user_presence p
      JOIN "User" u ON p.user_id = u.user_id
      WHERE p.status = 'online' OR p.last_seen >= ?
      ORDER BY p.last_seen DESC
    `)
    .all(cutoff) as any[];

  return users.map((u) => ({
    id: u.user_id,
    username: u.username,
    email: u.user_email,
    lastSeenAt: u.last_seen,
    isOnline: u.status === 'online'
  }));
}

export function listRooms(userId: number) {
  const rooms = db.prepare(`SELECT * FROM Chatroom ORDER BY chatroom_id DESC`).all() as any[];

  // A room is visible to a user only if their id is inside the JSON member list.
  return rooms
    .filter((room) => parseJsonArray(room.chatroom_user_list).includes(userId))
    .map((room) => ({
      id: room.chatroom_id,
      name: room.chatroom_name,
      slug: room.chatroom_slug,
      ownerId: room.chatroom_owner_id,
      size: room.chatroom_size,
      visibility: room.chatroom_public_private,
      memberIds: parseJsonArray(room.chatroom_user_list),
      messageIds: parseJsonArray(room.chatroom_msg)
    }));
}

export function createRoom(userId: number, input: { name: string; visibility?: number }) {
  const slug = normalizeUsername(input.name).replace(/[^a-z0-9\-]+/g, "-");

  // The creator starts as the first member, so they can open the room immediately.
  const room = db
    .prepare(`
      INSERT INTO Chatroom (chatroom_name, chatroom_slug, chatroom_user_list, chatroom_size, chatroom_public_private, chatroom_msg, chatroom_owner_id)
      VALUES (?, ?, ?, 1, ?, '[]', ?)
      RETURNING chatroom_id as id, chatroom_name as name, chatroom_slug as slug, chatroom_owner_id as ownerId
    `)
    .get(input.name.trim(), slug, stringifyJsonArray([userId]), input.visibility ?? 1, userId) as any;

  return room;
}

export function getRoomByIdentifier(identifier: string, userId: number) {
  const roomId = Number(identifier) || -1;
  const room = db.prepare(`SELECT * FROM Chatroom WHERE chatroom_slug = ? OR chatroom_id = ? LIMIT 1`).get(identifier, roomId) as any;

  // Membership is the access check; non-members should not see the room payload.
  if (!room || !parseJsonArray(room.chatroom_user_list).includes(userId)) return null;

  // Retrieve messages by IDs stored in the chatroom record (Chatroom.chatroom_msg)
  const msgIds = parseJsonArray(room.chatroom_msg);
  let messages: any[] = [];
  if (msgIds.length > 0) {
    const placeholders = msgIds.map(() => "?").join(",");
    messages = db
      .prepare(`
        SELECT m.msg_id as id, m.sender_id as senderId, m.content as content, m.msg_timestamp as timestamp, u.username
        FROM messages m
        LEFT JOIN "User" u ON m.sender_id = u.user_id
        WHERE m.msg_id IN (${placeholders})
        ORDER BY m.msg_timestamp ASC
        LIMIT 200
      `)
      .all(...msgIds) as any[];
  }

  return {
    id: room.chatroom_id,
    name: room.chatroom_name,
    slug: room.chatroom_slug,
    ownerId: room.chatroom_owner_id,
    size: room.chatroom_size,
    visibility: room.chatroom_public_private,
    memberIds: parseJsonArray(room.chatroom_user_list),
    messageIds: msgIds,
    messages: messages.map((m) => ({ ...m, sender: { id: m.senderId, username: m.username } }))
  };
}

export function sendRoomMessage(input: { roomId: number; senderId: number; content: string; kind?: string }) {
  const room = db.prepare(`SELECT * FROM Chatroom WHERE chatroom_id = ?`).get(input.roomId) as any;
  if (!room) throw new Error("ROOM_NOT_FOUND");

  const members = parseJsonArray(room.chatroom_user_list);
  // Messages are rejected unless the sender is already in the room.
  if (!members.includes(input.senderId)) throw new Error("NOT_A_MEMBER");

  const now = new Date().toISOString();
  const message = db
    .prepare(`
      INSERT INTO messages (sender_id, content, msg_timestamp)
      VALUES (?, ?, ?)
      RETURNING msg_id as id, sender_id as senderId, content as content, msg_timestamp as timestamp
    `)
    .get(input.senderId, input.content, now) as any;

  const msgIds = parseJsonArray(room.chatroom_msg || '[]');
  msgIds.push(message.id);
  db.prepare(`UPDATE Chatroom SET chatroom_msg = ? WHERE chatroom_id = ?`).run(stringifyJsonArray(msgIds), input.roomId);

  const sender = db.prepare(`SELECT username FROM "User" WHERE user_id = ?`).get(input.senderId) as any;
  return { ...message, sender: { id: input.senderId, username: sender?.username } };
}

export function listRoomInvites(userId: number) {
  return db
    .prepare(`
      SELECT ri.invite_id, ri.room_id, ri.sender_id, ri.recipient_id, ri.status, ri.created_at,
             c.chatroom_id as chatroom_id, c.chatroom_name, c.chatroom_slug,
             u.user_id as sender_user_id, u.username as username
      FROM room_invites ri
      JOIN Chatroom c ON ri.room_id = c.chatroom_id
      JOIN "User" u ON ri.sender_id = u.user_id
      WHERE ri.recipient_id = ? AND ri.status = 'pending'
      ORDER BY ri.created_at DESC
    `)
    .all(userId) as any[];
}

export function inviteToRoom(input: { roomId: number; senderId: number; username: string }) {
  const recipient = db
    .prepare(`SELECT user_id FROM "User" WHERE username = ?`)
    .get(normalizeUsername(input.username)) as any;

  if (!recipient) throw new Error("USER_NOT_FOUND");

  assertNoBlock(input.senderId, recipient.user_id);

  const existing = db.prepare(`SELECT * FROM room_invites WHERE room_id = ? AND recipient_id = ?`).get(input.roomId, recipient.user_id) as any;

  if (existing) {
    const updated = db
      .prepare(`UPDATE room_invites SET sender_id = ?, status = 'pending', created_at = CURRENT_TIMESTAMP WHERE invite_id = ? RETURNING invite_id as inviteId, room_id as roomId, sender_id as senderId, recipient_id as recipientId, status, created_at`)
      .get(input.senderId, existing.invite_id) as any;
    return updated;
  } else {
    const inserted = db
      .prepare(`INSERT INTO room_invites (room_id, sender_id, recipient_id, status, created_at) VALUES (?, ?, ?, 'pending', CURRENT_TIMESTAMP) RETURNING invite_id as inviteId, room_id as roomId, sender_id as senderId, recipient_id as recipientId, status, created_at`)
      .get(input.roomId, input.senderId, recipient.user_id) as any;
    return inserted;
  }
}

export function respondToRoomInvite(input: { inviteId: number; userId: number; status: "accepted" | "declined" }) {
  const invite = db.prepare(`SELECT * FROM room_invites WHERE invite_id = ?`).get(input.inviteId) as any;
  if (!invite || invite.recipient_id !== input.userId) throw new Error("NOT_FOUND");

  const updated = db.prepare(`UPDATE room_invites SET status = ? WHERE invite_id = ? RETURNING invite_id as inviteId, room_id as roomId, sender_id as senderId, recipient_id as recipientId, status, created_at`).get(input.status, input.inviteId) as any;

  if (input.status === "accepted") {
    // Accepting an invite mutates the room membership list, which is what the app checks later.
    const room = db.prepare(`SELECT * FROM Chatroom WHERE chatroom_id = ?`).get(invite.room_id) as any;
    if (room) {
      const members = parseJsonArray(room.chatroom_user_list);
      if (!members.includes(input.userId)) {
        members.push(input.userId);
        db.prepare(`UPDATE Chatroom SET chatroom_user_list = ?, chatroom_size = ? WHERE chatroom_id = ?`).run(
          stringifyJsonArray(members),
          members.length,
          room.chatroom_id
        );
      }
    }
  }

  return updated;
}

export function listFriendRequests(userId: number, scope: "incoming" | "all" = "incoming") {
  const query =
    scope === "all"
      ? `
        SELECT fr.request_id, fr.sender_id, fr.recipient_id, fr.status, u1.username as senderName, u2.username as recipientName
        FROM friend_requests fr
        JOIN "User" u1 ON fr.sender_id = u1.user_id
        JOIN "User" u2 ON fr.recipient_id = u2.user_id
        WHERE (fr.sender_id = ? OR fr.recipient_id = ?)
          AND fr.sender_id != fr.recipient_id
        ORDER BY fr.created_at DESC
      `
      : `
        SELECT fr.request_id, fr.sender_id, fr.recipient_id, fr.status, u1.username as senderName, u2.username as recipientName
        FROM friend_requests fr
        JOIN "User" u1 ON fr.sender_id = u1.user_id
        JOIN "User" u2 ON fr.recipient_id = u2.user_id
        WHERE fr.recipient_id = ?
          AND fr.status = 'pending'
          AND fr.sender_id != fr.recipient_id
        ORDER BY fr.created_at DESC
      `;

  return scope === "all"
    ? db.prepare(query).all(userId, userId) as any[]
    : db.prepare(query).all(userId) as any[];
}

export function sendFriendRequest(input: { senderId: number; recipientId: number }) {
  const recipient = db
    .prepare(`SELECT user_id FROM "User" WHERE user_id = ?`)
    .get(input.recipientId) as any;

  if (!recipient) throw new Error("USER_NOT_FOUND");
  if (recipient.user_id === input.senderId) throw new Error("SELF_REQUEST");

  const [user1Id, user2Id] = [input.senderId, recipient.user_id].sort((a, b) => a - b);
  const existingFriendship = db
    .prepare(`SELECT * FROM Friendlist WHERE user_1_id = ? AND user_2_id = ?`)
    .get(user1Id, user2Id) as any;

  if (existingFriendship) throw new Error("ALREADY_FRIENDS");

  assertNoBlock(input.senderId, recipient.user_id);

  const existing = db.prepare(`SELECT * FROM friend_requests WHERE sender_id = ? AND recipient_id = ?`).get(input.senderId, recipient.user_id) as any;

  if (existing) {
    db.prepare(`UPDATE friend_requests SET status = 'pending' WHERE request_id = ?`).run(existing.request_id);
  } else {
    db.prepare(`
      INSERT INTO friend_requests (sender_id, recipient_id, status)
      VALUES (?, ?, 'pending')
    `).run(input.senderId, recipient.user_id);
  }

  return { senderId: input.senderId, recipientId: recipient.user_id, status: "pending" };
}

export function respondToFriendRequest(input: { requestId: number; userId: number; status: "accepted" | "declined" }) {
  const request = db.prepare(`SELECT * FROM friend_requests WHERE request_id = ?`).get(input.requestId) as any;
  if (!request || request.recipient_id !== input.userId) throw new Error("NOT_FOUND");

  db.prepare(`UPDATE friend_requests SET status = ? WHERE request_id = ?`).run(input.status, input.requestId);

  if (input.status === "accepted") {
    const [user1Id, user2Id] = [request.sender_id, request.recipient_id].sort((a, b) => a - b);
    const existing = db.prepare(`SELECT * FROM Friendlist WHERE user_1_id = ? AND user_2_id = ?`).get(user1Id, user2Id);
    if (!existing) {
      db.prepare(`INSERT INTO Friendlist (user_1_id, user_2_id) VALUES (?, ?)`).run(user1Id, user2Id);
    }
  }

  return { requestId: input.requestId, status: input.status };
}

export function listFriends(userId: number) {
  return db
    .prepare(`
      SELECT u.user_id, u.username, u.user_email
      FROM Friendlist f
      JOIN "User" u ON CASE WHEN f.user_1_id = ? THEN f.user_2_id ELSE f.user_1_id END = u.user_id
      WHERE f.user_1_id = ? OR f.user_2_id = ?
    `)
    .all(userId, userId, userId)
    .map((u: any) => ({ id: u.user_id, username: u.username, email: u.user_email }));
}

export function blockUser(input: { blockerId: number; username: string }) {
  const blockedUser = db
    .prepare(`SELECT user_id FROM "User" WHERE username = ?`)
    .get(normalizeUsername(input.username)) as any;

  if (!blockedUser) throw new Error("USER_NOT_FOUND");
  if (blockedUser.user_id === input.blockerId) throw new Error("SELF_BLOCK");

  const existing = db.prepare(`SELECT * FROM blocks WHERE blocker_id = ? AND blocked_id = ?`).get(input.blockerId, blockedUser.user_id);

  if (!existing) {
    db.prepare(`INSERT INTO blocks (blocker_id, blocked_id) VALUES (?, ?)`).run(input.blockerId, blockedUser.user_id);
    
    // Remove from friends list if they're friends
    const [user1Id, user2Id] = [input.blockerId, blockedUser.user_id].sort((a, b) => a - b);
    db.prepare(`DELETE FROM Friendlist WHERE user_1_id = ? AND user_2_id = ?`).run(user1Id, user2Id);
  }

  return { blockerId: input.blockerId, blockedUserId: blockedUser.user_id };
}

export function unblockUser(blockerId: number, blockedUserId: number) {
  db.prepare(`DELETE FROM blocks WHERE blocker_id = ? AND blocked_id = ?`).run(blockerId, blockedUserId);
}

export function listBlockedUsers(userId: number) {
  return db
    .prepare(`
      SELECT b.blocker_id, b.blocked_id, u.username, u.user_id
      FROM blocks b
      JOIN "User" u ON b.blocked_id = u.user_id
      WHERE b.blocker_id = ?
      ORDER BY b.created_at DESC
    `)
    .all(userId)
    .map((b: any) => ({ blockerId: b.blocker_id, blockedUserId: b.blocked_id, blockedUser: { id: b.blocked_id, username: b.username } }));
}

export function getUserProfile(username: string) {
  const user = db
    .prepare(
      `
    SELECT u.user_id, u.username, u.user_email, p.bio, p.header_img, p.profile_img, p.header_img_x, p.header_img_y, p.header_img_scale, ep.last_seen, ep.status
    FROM "User" u
    LEFT JOIN user_profile p ON u.user_id = p.user_id
    LEFT JOIN user_presence ep ON u.user_id = ep.user_id
    WHERE u.username = ?
  `
    )
    .get(normalizeUsername(username)) as any;

  return user
    ? {
        id: user.user_id,
        username: user.username,
        email: user.user_email,
        bio: user.bio,
        profile: {
          bio: user.bio,
          header_img: user.header_img,
          profile_img: user.profile_img,
          header_img_x: user.header_img_x ?? 0,
          header_img_y: user.header_img_y ?? 0,
          header_img_scale: user.header_img_scale ?? 1
        },
        friends: listFriends(user.user_id)
      }
    : null;
}

export function getUserById(userId: number) {
  const user = db
    .prepare(
      `
    SELECT u.user_id, u.username, u.user_email
    FROM "User" u
    WHERE u.user_id = ?
  `
    )
    .get(userId) as any;

  return user
    ? {
        id: user.user_id,
        username: user.username,
        email: user.user_email
      }
    : null;
}

export function listImageTypes() {
  const defaults = ["header", "profile"];
  const existingTypes = db.prepare(`SELECT image_type_name FROM image_types`).all() as Array<{ image_type_name: string }>;
  const existingNames = new Set(existingTypes.map((type) => type.image_type_name.toLowerCase()));

  for (const name of defaults) {
    if (!existingNames.has(name)) {
      db.prepare(`INSERT INTO image_types (image_type_name) VALUES (?)`).run(name);
    }
  }

  return db.prepare(`SELECT image_type_id as id, image_type_name as name FROM image_types ORDER BY image_type_id ASC`).all();
}

export function createImageType(input: { name: string }) {
  const result = db.prepare(`INSERT INTO image_types (image_type_name) VALUES (?) RETURNING image_type_id as id, image_type_name as name`).get(input.name) as any;
  return result;
}

export function listImages(userId?: number) {
  if (userId) {
    return db
      .prepare(
        `
      SELECT i.image_id as id, i.image_source as source, it.image_type_id as imageTypeId, it.image_type_name as imageTypeName
      FROM images i
      LEFT JOIN image_types it ON i.image_type_id = it.image_type_id
      WHERE i.user_id = ?
      ORDER BY i.image_id DESC
    `
      )
      .all(userId)
      .map((img: any) => ({ ...img, imageType: { id: img.imageTypeId, name: img.imageTypeName } }));
  }
  return db
    .prepare(
      `
    SELECT i.image_id as id, i.image_source as source, it.image_type_id as imageTypeId, it.image_type_name as imageTypeName
    FROM images i
    LEFT JOIN image_types it ON i.image_type_id = it.image_type_id
    ORDER BY i.image_id DESC
  `
    )
    .all()
    .map((img: any) => ({ ...img, imageType: { id: img.imageTypeId, name: img.imageTypeName } }));
}

export function createImage(input: { userId: number; source: string; imageTypeId?: number }) {
  const result = db
    .prepare(`INSERT INTO images (user_id, image_source, image_type_id) VALUES (?, ?, ?) RETURNING image_id as id, image_source as source, image_type_id as imageTypeId`)
    .get(input.userId, input.source, input.imageTypeId ?? null) as any;
  return result;
}

// ===== PRIVATE MESSAGING =====

export function sendPrivateMessage(input: { senderId: number; recipientId: number; content: string }) {
  const recipient = db
    .prepare(`SELECT user_id FROM "User" WHERE user_id = ?`)
    .get(input.recipientId) as any;

  if (!recipient) throw new Error("USER_NOT_FOUND");
  if (input.senderId === input.recipientId) throw new Error("SELF_MESSAGE");

  assertNoBlock(input.senderId, input.recipientId);

  // Create a message entry
  const now = new Date().toISOString();
  const message = db
    .prepare(`
      INSERT INTO messages (sender_id, content, msg_timestamp)
      VALUES (?, ?, ?)
      RETURNING msg_id as id, sender_id as senderId, content, msg_timestamp as timestamp
    `)
    .get(input.senderId, input.content, now) as any;

  // Link it to the private message table
  db.prepare(`
    INSERT INTO private_msg (sender_id, recipient_id, msg_id)
    VALUES (?, ?, ?)
  `).run(input.senderId, input.recipientId, message.id);

  const sender = db.prepare(`SELECT username FROM "User" WHERE user_id = ?`).get(input.senderId) as any;
  return { ...message, sender: { id: input.senderId, username: sender?.username } };
}

export function getPrivateMessages(userId: number, otherUserId: number, limit = 50) {
  const messages = db
    .prepare(`
      SELECT m.msg_id as id, m.sender_id as senderId, m.content, m.msg_timestamp as timestamp, u.username
      FROM private_msg pm
      JOIN messages m ON pm.msg_id = m.msg_id
      JOIN "User" u ON m.sender_id = u.user_id
      WHERE (pm.sender_id = ? AND pm.recipient_id = ?)
         OR (pm.sender_id = ? AND pm.recipient_id = ?)
      ORDER BY m.msg_timestamp ASC
      LIMIT ?
    `)
    .all(userId, otherUserId, otherUserId, userId, limit) as any[];

  return messages.map((m) => ({ ...m, sender: { id: m.senderId, username: m.username } }));
}

export function listPrivateConversations(userId: number) {
  // Get the most recent message from each conversation
  const conversations = db
    .prepare(`
      SELECT DISTINCT 
        CASE 
          WHEN pm.sender_id = ? THEN pm.recipient_id
          ELSE pm.sender_id
        END as otherUserId,
        u.username,
        u.user_id,
        MAX(m.msg_timestamp) as lastMessageTime,
        (SELECT m2.msg_id FROM messages m2 
         WHERE m2.msg_id = pm.msg_id 
         ORDER BY m2.msg_timestamp DESC LIMIT 1) as lastMessageId
      FROM private_msg pm
      JOIN messages m ON pm.msg_id = m.msg_id
      JOIN "User" u ON CASE 
        WHEN pm.sender_id = ? THEN pm.recipient_id
        ELSE pm.sender_id
      END = u.user_id
      WHERE pm.sender_id = ? OR pm.recipient_id = ?
      GROUP BY otherUserId, u.username, u.user_id
      ORDER BY lastMessageTime DESC
    `)
    .all(userId, userId, userId, userId) as any[];

  return conversations.map((c) => ({
    userId: c.user_id,
    username: c.username,
    lastMessageTime: c.lastMessageTime,
    lastMessageId: c.lastMessageId
  }));
}