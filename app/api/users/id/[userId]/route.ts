import { NextResponse } from "next/server";
import { badRequestResponse, getUserById, internalErrorResponse, notFoundResponse } from "@/lib/backend";

type Params = {
  params: Promise<{ userId: string }>;
};

export async function GET(_request: Request, { params }: Params) {
  try {
    const { userId } = await params;
    const id = parseInt(userId, 10);

    if (!Number.isFinite(id)) {
      return badRequestResponse("Invalid user ID");
    }

    const user = getUserById(id);

    if (!user) {
      return notFoundResponse("User not found");
    }

    return NextResponse.json({ user });
  } catch (error) {
    return internalErrorResponse();
  }
}
