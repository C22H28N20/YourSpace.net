import { NextResponse } from "next/server";
import { badRequestResponse, createRoom, getCurrentUser, listRooms, internalErrorResponse, requireSameOrigin, unauthorizedResponse } from "@/lib/backend";
import { createRoomSchema } from "@/lib/validation";

export async function GET() {
  // Only authenticated users can see their room list.
  const user = await getCurrentUser();

  if (!user) {
    return unauthorizedResponse();
  }

  const rooms = await listRooms(user.id);
  return NextResponse.json({ rooms });
}

export async function POST(request: Request) {
  // Room creation always assigns the creator as the first member.
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
    const parsed = createRoomSchema.safeParse(body);

    if (!parsed.success) {
      return badRequestResponse(parsed.error.issues[0]?.message ?? "Invalid room data");
    }

    const room = await createRoom(user.id, parsed.data);
    return NextResponse.json({ room });
  } catch (error) {
    console.error("[API /rooms] Error creating room:", error);
    return internalErrorResponse(error instanceof Error ? error.message : "Failed to create room");
  }
}