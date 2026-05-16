import { NextResponse } from "next/server";
import { getCurrentUser, listRoomInvites, unauthorizedResponse } from "@/lib/backend";

export async function GET() {
  // Room invites are fetched for the currently authenticated user.
  const user = await getCurrentUser();

  if (!user) {
    return unauthorizedResponse();
  }

  const invites = await listRoomInvites(user.id);
  const normalizedInvites = invites.map((invite) => ({
    ...invite,
    chatroom_name: invite.chatroom_name ?? `Room ${invite.room_id}`,
    chatroom_slug: invite.chatroom_slug ?? String(invite.room_id)
  }));

  return NextResponse.json({ invites: normalizedInvites });
}