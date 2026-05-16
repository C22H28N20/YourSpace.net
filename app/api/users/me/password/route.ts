import { NextResponse } from "next/server";
import { badRequestResponse, changePassword, getCurrentUser, internalErrorResponse, requireSameOrigin, unauthorizedResponse } from "@/lib/backend";
import { changePasswordSchema } from "@/lib/validation";

export async function PATCH(request: Request) {
  // Password changes require the current password to be verified server-side.
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
    const parsed = changePasswordSchema.safeParse(body);

    if (!parsed.success) {
      return badRequestResponse(parsed.error.issues[0]?.message ?? "Invalid password data");
    }

    await changePassword(user.id, parsed.data.currentPassword, parsed.data.newPassword);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_PASSWORD") {
      return badRequestResponse("Current password is incorrect");
    }

    return internalErrorResponse();
  }
}