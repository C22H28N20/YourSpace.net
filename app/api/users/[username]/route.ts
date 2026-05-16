import { NextResponse } from "next/server";
import { getUserProfile, notFoundResponse } from "@/lib/backend";

type Params = {
  params: Promise<{ username: string }>;
};

export async function GET(_request: Request, { params }: Params) {
  // Public profile lookup by username.
  const { username } = await params;
  const user = await getUserProfile(username);

  if (!user) {
    return notFoundResponse("User not found");
  }

  return NextResponse.json({ user });
}