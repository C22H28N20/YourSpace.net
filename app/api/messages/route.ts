import { NextResponse } from "next/server";
import {
  badRequestResponse,
  getCurrentUser,
  getPrivateMessages,
  internalErrorResponse,
  listPrivateConversations,
  requireSameOrigin,
  sendPrivateMessage,
  unauthorizedResponse
} from "@/lib/backend";
import { sendMessageSchema } from "@/lib/validation";

export async function GET() {
  // List all private message conversations for the current user
  const user = await getCurrentUser();

  if (!user) {
    return unauthorizedResponse();
  }

  try {
    const conversations = listPrivateConversations(user.id);
    return NextResponse.json({ conversations });
  } catch (error) {
    return internalErrorResponse();
  }
}

export async function POST(request: Request) {
  // Send a private message
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
    const parsed = sendMessageSchema.safeParse(body);

    if (!parsed.success) {
      return badRequestResponse(parsed.error.issues[0]?.message ?? "Invalid message data");
    }

    if (!parsed.data.recipientId) {
      return badRequestResponse("Recipient ID is required for private messages");
    }

    const message = await Promise.resolve(
      sendPrivateMessage({
        senderId: user.id,
        recipientId: parsed.data.recipientId,
        content: parsed.data.content
      })
    );

    return NextResponse.json({ message });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "USER_NOT_FOUND") {
        return badRequestResponse("Recipient user not found");
      }
      if (error.message === "SELF_MESSAGE") {
        return badRequestResponse("Cannot send a message to yourself");
      }
      if (error.message === "BLOCKED") {
        return badRequestResponse("You cannot message this user (blocked)");
      }
    }

    return internalErrorResponse();
  }
}
