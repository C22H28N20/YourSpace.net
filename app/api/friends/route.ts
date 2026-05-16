import { NextResponse } from "next/server";
import { getCurrentUser, listFriends, unauthorizedResponse } from "@/lib/backend";

export async function GET() {
  // Friends are private to the logged-in account.
  const user = await getCurrentUser();

  if (!user) {
    return unauthorizedResponse();
  }

  const friends = listFriends(user.id);
  return NextResponse.json({ friends });
}