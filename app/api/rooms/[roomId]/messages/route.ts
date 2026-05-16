import { NextResponse } from "next/server";
import { badRequestResponse, getCurrentUser, getRoomByIdentifier, internalErrorResponse, requireSameOrigin, sendRoomMessage, unauthorizedResponse } from "@/lib/backend";
import { sendMessageSchema } from "@/lib/validation";

type Params = {
  params: Promise<{ roomId: string }>;
};

export async function GET(_request: Request, { params }: Params) {
  // Message history is only returned to room members.
  const user = await getCurrentUser();

  if (!user) {
    return unauthorizedResponse();
  }

  const { roomId } = await params;
  const room = await getRoomByIdentifier(roomId, user.id);

  if (!room) {
    return unauthorizedResponse();
  }

  return NextResponse.json({ messages: room.messages });
}

export async function POST(request: Request, { params }: Params) {
  // Send a message through the shared room membership check.
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

    const { roomId } = await params;
    const room = await getRoomByIdentifier(roomId, user.id);

    if (!room) {
      return unauthorizedResponse();
    }

    const message = await sendRoomMessage({
      roomId: room.id,
      senderId: user.id,
      content: parsed.data.content,
      kind: parsed.data.kind
    });

    return NextResponse.json({ message });
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_A_MEMBER") {
      return badRequestResponse("You are not a member of this room");
    }

    return internalErrorResponse();
  }
}