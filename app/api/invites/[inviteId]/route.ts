import { NextResponse } from "next/server";
import { badRequestResponse, getCurrentUser, internalErrorResponse, requireSameOrigin, respondToRoomInvite, unauthorizedResponse } from "@/lib/backend";

type Params = {
  params: Promise<{ inviteId: string }>;
};

export async function PATCH(request: Request, { params }: Params) {
  // Only the invite recipient can update the invite status.
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
    const status = body.status === "accepted" ? "accepted" : "declined";
    const { inviteId } = await params;
    const invite = await respondToRoomInvite({ inviteId: Number(inviteId), userId: user.id, status });

    return NextResponse.json({ invite });
  } catch {
    return badRequestResponse("Invite not found");
  }
}