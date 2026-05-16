import { NextResponse } from "next/server";
import { badRequestResponse, blockUser, getCurrentUser, internalErrorResponse, listBlockedUsers, requireSameOrigin, unauthorizedResponse } from "@/lib/backend";
import { blockSchema } from "@/lib/validation";

export async function GET() {
  // Blocking data is private to the current account.
  const user = await getCurrentUser();

  if (!user) {
    return unauthorizedResponse();
  }

  const blocks = await listBlockedUsers(user.id);
  return NextResponse.json({ blocks });
}

export async function POST(request: Request) {
  // Block creation is keyed off the target username.
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
    const parsed = blockSchema.safeParse(body);

    if (!parsed.success) {
      return badRequestResponse(parsed.error.issues[0]?.message ?? "Invalid block data");
    }

    const block = await blockUser({ blockerId: user.id, username: parsed.data.username });
    return NextResponse.json({ block });
  } catch (error) {
    if (error instanceof Error && error.message === "USER_NOT_FOUND") {
      return badRequestResponse("User not found");
    }

    return internalErrorResponse();
  }
}