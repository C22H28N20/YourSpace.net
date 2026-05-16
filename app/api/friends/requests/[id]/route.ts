import { NextResponse } from "next/server";
import { badRequestResponse, getCurrentUser, internalErrorResponse, requireSameOrigin, respondToFriendRequest, unauthorizedResponse } from "@/lib/backend";

type Params = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: Params) {
  // Accept/decline is only allowed by the recipient of the request.
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
    const { id } = await params;
    const requestRecord = await respondToFriendRequest({ requestId: Number(id), userId: user.id, status });

    return NextResponse.json({ request: requestRecord });
  } catch {
    return badRequestResponse("Friend request not found");
  }
}