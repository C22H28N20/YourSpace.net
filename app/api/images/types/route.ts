import { NextResponse } from "next/server";
import { badRequestResponse, createImageType, getCurrentUser, internalErrorResponse, listImageTypes, requireSameOrigin, unauthorizedResponse } from "@/lib/backend";
import { imageTypeSchema } from "@/lib/validation";

export async function GET() {
  // Image types are a small lookup table used by the profile and image picker UI.
  const types = await listImageTypes();
  return NextResponse.json({ types });
}

export async function POST(request: Request) {
  // Type creation is restricted to logged-in users for now.
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
    const parsed = imageTypeSchema.safeParse(body);

    if (!parsed.success) {
      return badRequestResponse(parsed.error.issues[0]?.message ?? "Invalid image type data");
    }

    const type = await createImageType(parsed.data);
    return NextResponse.json({ type });
  } catch {
    return internalErrorResponse();
  }
}