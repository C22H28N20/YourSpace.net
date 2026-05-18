import { NextResponse } from "next/server";
import { getCurrentUser, unfriendUser, unauthorizedResponse } from "@/lib/backend";

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  // Delete friendship relationship
  const user = await getCurrentUser();

  if (!user) {
    return unauthorizedResponse();
  }

  const friendId = parseInt(params.id, 10);
  if (isNaN(friendId)) {
    return NextResponse.json({ error: "Invalid friend ID" }, { status: 400 });
  }

  try {
    unfriendUser(user.id, friendId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to unfriend user" }, { status: 500 });
  }
}