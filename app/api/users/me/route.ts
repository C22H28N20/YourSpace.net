import { NextResponse } from "next/server";
import { badRequestResponse, getCurrentUser, internalErrorResponse, notFoundResponse, requireSameOrigin, unauthorizedResponse, updateProfile } from "@/lib/backend";
import { db } from "@/lib/db";
import { updateProfileSchema } from "@/lib/validation";

export async function GET() {
  // Return the authenticated user record for settings and profile screens.
  const user = await getCurrentUser();

  if (!user) {
    return unauthorizedResponse();
  }

  const profile = db.prepare(`SELECT bio, header_img, profile_img, header_img_x, header_img_y, header_img_scale FROM user_profile WHERE user_id = ?`).get(user.id) as
    | { bio: string | null; header_img: number | null; profile_img: number | null; header_img_x: number | null; header_img_y: number | null; header_img_scale: number | null }
    | undefined;

  return NextResponse.json({
    user: {
      ...user,
      profile: profile ?? { bio: null, header_img: null, profile_img: null, header_img_x: 0, header_img_y: 0, header_img_scale: 1 }
    }
  });
}

export async function PATCH(request: Request) {
  // Profile updates are validated first, then mapped onto the stored user row.
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
    const parsed = updateProfileSchema.safeParse(body);

    if (!parsed.success) {
      return badRequestResponse(parsed.error.issues[0]?.message ?? "Invalid profile data");
    }

    const updated = await updateProfile(user.id, parsed.data);
    return NextResponse.json({ user: updated });
  } catch (error) {
    if (error instanceof Error && error.message === "USERNAME_TAKEN") {
      return badRequestResponse("Username already taken");
    }

    if (error instanceof Error && error.message === "NOT_FOUND") {
      return notFoundResponse();
    }

    return internalErrorResponse();
  }
}