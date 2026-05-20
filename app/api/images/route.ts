import { NextResponse } from "next/server";
import { badRequestResponse, createImage, getCurrentUser, internalErrorResponse, listImages, requireSameOrigin, unauthorizedResponse } from "@/lib/backend";
import { imageSchema } from "@/lib/validation";

export async function GET() {
  // Only return images for the authenticated user
  const user = await getCurrentUser();
  if (!user) {
    return unauthorizedResponse();
  }
  const images = await listImages(user.id);
  return NextResponse.json({ images });
}

export async function POST(request: Request) {
  // Store the image source URL/path and optional type relationship.
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
    const parsed = imageSchema.safeParse(body);

    if (!parsed.success) {
      return badRequestResponse(parsed.error.issues[0]?.message ?? "Invalid image data");
    }

    const image = await createImage({ ...parsed.data, userId: user.id });
    return NextResponse.json({ image });
  } catch (error) {
    console.error("[API /api/images] POST error:", error);
    return internalErrorResponse();
  }
}