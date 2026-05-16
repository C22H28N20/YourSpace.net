import { NextResponse } from "next/server";
import { badRequestResponse, forbiddenResponse, getCurrentUser, getRoomByIdentifier, inviteToRoom, internalErrorResponse, requireSameOrigin, unauthorizedResponse } from "@/lib/backend";
import { inviteSchema } from "@/lib/validation";

type Params = {
  params: Promise<{ roomId: string }>;
};

export async function POST(request: Request, { params }: Params) {
  // Invites are created by a current room member for another username.
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
    const parsed = inviteSchema.safeParse(body);

    if (!parsed.success) {
      return badRequestResponse(parsed.error.issues[0]?.message ?? "Invalid invite data");
    }

    const { roomId } = await params;
    const room = await getRoomByIdentifier(roomId, user.id);

    if (!room) {
      return unauthorizedResponse();
    }

    const invite = await inviteToRoom({ roomId: room.id, senderId: user.id, username: parsed.data.username });
    return NextResponse.json({ invite });
  } catch (error) {
    console.error('Invite error:', error);
    if (error instanceof Error) {
      if (error.message === "USER_NOT_FOUND") return badRequestResponse("User not found");
      if (error.message === "BLOCKED") return forbiddenResponse("You cannot invite this user");
    }
    return internalErrorResponse();
  }
}