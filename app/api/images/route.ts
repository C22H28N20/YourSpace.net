import { NextResponse } from "next/server";
import { badRequestResponse, createImage, getCurrentUser, internalErrorResponse, listImages, requireSameOrigin, unauthorizedResponse } from "@/lib/backend";
import { imageSchema } from "@/lib/validation";

export async function GET() {
  // Image metadata is public even though creation is authenticated.
  const images = await listImages();
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

    const image = await createImage(parsed.data);
    return NextResponse.json({ image });
  } catch {
    return internalErrorResponse();
  }
}