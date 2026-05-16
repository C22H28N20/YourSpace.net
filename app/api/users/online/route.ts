import { NextResponse } from "next/server";
import { getCurrentUser, listOnlineUsers, markUserOnline, requireSameOrigin, unauthorizedResponse } from "@/lib/backend";

export async function GET() {
  // Online presence is a lightweight snapshot, not a live websocket stream yet.
  const users = await listOnlineUsers();
  return NextResponse.json({ users });
}

export async function POST(request: Request) {
  // Clients can ping this route to refresh their presence timestamp.
  const originError = requireSameOrigin(request);
  if (originError) {
    return originError;
  }

  const user = await getCurrentUser();

  if (!user) {
    return unauthorizedResponse();
  }

  await markUserOnline(user.id);
  return NextResponse.json({ ok: true });
}