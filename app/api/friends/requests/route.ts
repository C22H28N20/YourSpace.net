import { NextResponse } from "next/server";
import { badRequestResponse, getCurrentUser, internalErrorResponse, listFriendRequests, requireSameOrigin, sendFriendRequest, unauthorizedResponse } from "@/lib/backend";
import { friendRequestSchema } from "@/lib/validation";

export async function GET(request: Request) {
  // Friend requests are scoped to the logged-in user.
  const user = await getCurrentUser();

  if (!user) {
    return unauthorizedResponse();
  }

  const { searchParams } = new URL(request.url);
  const scope = searchParams.get("scope") === "all" ? "all" : "incoming";
  const requests = await listFriendRequests(user.id, scope);
  return NextResponse.json({ requests });
}

export async function POST(request: Request) {
  // Sending a request only needs the target username.
  const originError = requireSameOrigin(request);
  if (originError) {
    return originError;
  }

  const user = await getCurrentUser();

  if (!user) {
    return unauthorizedResponse();
  }

  try {
    const body = await request.json();
    const parsed = friendRequestSchema.safeParse(body);

    if (!parsed.success) {
      return badRequestResponse(parsed.error.issues[0]?.message ?? "Invalid request data");
    }

    if (parsed.data.recipientId === user.id) {
      return badRequestResponse("You cannot send a friend request to yourself");
    }

    const requestRecord = await sendFriendRequest({ senderId: user.id, recipientId: parsed.data.recipientId });
    return NextResponse.json({ request: requestRecord });
  } catch (error) {
    if (error instanceof Error && error.message === "USER_NOT_FOUND") {
      return badRequestResponse("User not found");
    }

    if (error instanceof Error && error.message === "ALREADY_FRIENDS") {
      return badRequestResponse("You are already friends with this user");
    }

    if (error instanceof Error && error.message === "SELF_REQUEST") {
      return badRequestResponse("You cannot send a friend request to yourself");
    }

    return internalErrorResponse();
  }
}