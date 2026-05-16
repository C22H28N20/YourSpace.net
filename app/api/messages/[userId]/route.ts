import { NextResponse } from "next/server";
import { badRequestResponse, getCurrentUser, getPrivateMessages, internalErrorResponse, unauthorizedResponse } from "@/lib/backend";

type Params = {
  params: Promise<{ userId: string }>;
};

export async function GET(_request: Request, { params }: Params) {
  // Get message history with a specific user
  const user = await getCurrentUser();

  if (!user) {
    return unauthorizedResponse();
  }

  try {
    const { userId } = await params;
    const otherUserId = parseInt(userId, 10);

    if (!Number.isFinite(otherUserId)) {
      return badRequestResponse("Invalid user ID");
    }

    if (otherUserId === user.id) {
      return badRequestResponse("Cannot get messages with yourself");
    }

    const messages = getPrivateMessages(user.id, otherUserId);
    return NextResponse.json({ messages });
  } catch (error) {
    return internalErrorResponse();
  }
}
