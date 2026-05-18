import { NextResponse } from "next/server";
import { getCurrentUser, listFriends, unauthorizedResponse } from "@/lib/backend";

export async function GET(request: Request) {
  // Friends are private to the logged-in account.
  const user = await getCurrentUser();

  if (!user) {
    return unauthorizedResponse();
  }

  const url = new URL(request.url);
  const offset = parseInt(url.searchParams.get("offset") ?? "0", 10);
  const limit = parseInt(url.searchParams.get("limit") ?? "10", 10);

  const friends = listFriends(user.id, offset, limit);
  const totalCount = listFriends(user.id, 0, -1).length;
  
  return NextResponse.json({ friends, totalCount });
}