import { NextResponse } from "next/server";
import { getCurrentUser, getRoomByIdentifier, notFoundResponse, unauthorizedResponse } from "@/lib/backend";

type Params = {
  params: Promise<{ roomId: string }>;
};

export async function GET(_request: Request, { params }: Params) {
  // Room access is gated by membership, not by guessing the room ID.
  const user = await getCurrentUser();

  if (!user) {
    return unauthorizedResponse();
  }

  const { roomId } = await params;
  const room = await getRoomByIdentifier(roomId, user.id);

  if (!room) {
    return notFoundResponse("Room not found");
  }

  return NextResponse.json({ room });
}