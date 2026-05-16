import { NextResponse } from "next/server";
import { getCurrentUser, unauthorizedResponse } from "@/lib/backend";
import { db } from "@/lib/db";

export async function GET() {
  // Expose the current session user for client-side auth checks.
  const user = await getCurrentUser();

  if (!user) {
    return unauthorizedResponse();
  }

  const profile = db.prepare(`SELECT bio, header_img, profile_img FROM user_profile WHERE user_id = ?`).get(user.id) as
    | { bio: string | null; header_img: number | null; profile_img: number | null }
    | undefined;

  const response = {
    user: {
      ...user,
      profile: profile ?? { bio: null, header_img: null, profile_img: null }
    }
  };

  return NextResponse.json(response);
}