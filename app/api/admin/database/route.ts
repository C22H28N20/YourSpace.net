import { NextResponse } from "next/server";
import { getCurrentUser, isAdmin, unauthorizedResponse, internalErrorResponse } from "@/lib/backend";
import { db } from "@/lib/db";

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

export async function GET(request: Request) {
  const user = await getCurrentUser();

  if (!user || !isAdmin(user)) {
    return unauthorizedResponse();
  }

  try {
    const tableName = new URL(request.url).searchParams.get("table");

    const tables = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name`).all() as Array<{
      name: string;
    }>;

    if (tableName) {
      const knownTable = tables.find((table) => table.name === tableName);
      if (!knownTable) {
        return NextResponse.json({ error: "Table not found" }, { status: 404 });
      }

      const rows = db.prepare(`SELECT * FROM "${tableName}"`).all();
      return NextResponse.json({ table: tableName, rows, success: true });
    }

    const tableInfo = tables.map((table) => {
      const countRow = db.prepare(`SELECT COUNT(*) as count FROM "${table.name}"`).get() as { count: number };
      return { name: table.name, count: countRow?.count ?? 0 };
    });

    return NextResponse.json({ tables: tableInfo, success: true });
  } catch (error) {
    console.error("[ADMIN DB] Error:", error);
    return internalErrorResponse("Failed to fetch database");
  }
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();

  if (!user || !isAdmin(user)) {
    return unauthorizedResponse();
  }

  const originError = request.headers.get("origin") ? null : unauthorizedResponse();
  if (originError) {
    return originError;
  }

  try {
    const body = await request.json();
    const targetUserId = Number(body.userId);

    if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
      return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
    }

    if (targetUserId === user.id) {
      return NextResponse.json({ error: "You cannot delete your own account" }, { status: 400 });
    }

    const targetUser = db.prepare(`SELECT user_id FROM "User" WHERE user_id = ?`).get(targetUserId) as any;
    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const deleteTransaction = db.transaction((userId: number) => {
      const roomRows = db
        .prepare(`SELECT chatroom_id, chatroom_user_list, chatroom_msg, chatroom_owner_id FROM Chatroom`)
        .all() as any[];

      const userMessageIds = db.prepare(`SELECT msg_id FROM messages WHERE sender_id = ?`).all(userId) as Array<{ msg_id: number }>;
      const messageIdSet = new Set(userMessageIds.map((message) => message.msg_id));

      for (const room of roomRows) {
        const members = parseJsonArray(room.chatroom_user_list);
        const messageIds = parseJsonArray(room.chatroom_msg);
        const nextMembers = members.filter((memberId) => memberId !== userId);
        const nextMessageIds = messageIds.filter((messageId) => !messageIdSet.has(messageId));

        if (nextMembers.length !== members.length || nextMessageIds.length !== messageIds.length || room.chatroom_owner_id === userId) {
          db.prepare(
            `UPDATE Chatroom
             SET chatroom_user_list = ?, chatroom_size = ?, chatroom_msg = ?, chatroom_owner_id = CASE WHEN chatroom_owner_id = ? THEN NULL ELSE chatroom_owner_id END
             WHERE chatroom_id = ?`
          ).run(stringifyJsonArray(nextMembers), nextMembers.length, stringifyJsonArray(nextMessageIds), userId, room.chatroom_id);
        }
      }

      db.prepare(`DELETE FROM room_invites WHERE sender_id = ? OR recipient_id = ?`).run(userId, userId);
      db.prepare(`DELETE FROM friend_requests WHERE sender_id = ? OR recipient_id = ?`).run(userId, userId);
      db.prepare(`DELETE FROM Friendlist WHERE user_1_id = ? OR user_2_id = ?`).run(userId, userId);
      db.prepare(`DELETE FROM blocks WHERE blocker_id = ? OR blocked_id = ?`).run(userId, userId);
      db.prepare(`DELETE FROM private_msg WHERE sender_id = ? OR recipient_id = ?`).run(userId, userId);
      db.prepare(`DELETE FROM sessions WHERE user_id = ?`).run(userId);
      db.prepare(`DELETE FROM user_presence WHERE user_id = ?`).run(userId);
      db.prepare(`DELETE FROM user_profile WHERE user_id = ?`).run(userId);
      db.prepare(`DELETE FROM messages WHERE sender_id = ?`).run(userId);
      db.prepare(`DELETE FROM "User" WHERE user_id = ?`).run(userId);
    });

    deleteTransaction(targetUserId);
    return NextResponse.json({ deleted: { userId: targetUserId } });
  } catch (error) {
    console.error("[ADMIN DB] Error deleting user:", error);
    return internalErrorResponse("Failed to delete user");
  }
}
