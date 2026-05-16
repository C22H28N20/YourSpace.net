import { NextResponse } from "next/server";
import { getCurrentUser, requireSameOrigin, unauthorizedResponse, unblockUser } from "@/lib/backend";

type Params = {
  params: Promise<{ blockedUserId: string }>;
};

export async function DELETE(_request: Request, { params }: Params) {
  // Unblock by numeric user id from the route segment.
  const originError = requireSameOrigin(_request);
  if (originError) {
    return originError;
  }

  const user = await getCurrentUser();

  if (!user) {
    return unauthorizedResponse();
  }

  const { blockedUserId } = await params;
  await unblockUser(user.id, Number(blockedUserId));
  return NextResponse.json({ ok: true });
}