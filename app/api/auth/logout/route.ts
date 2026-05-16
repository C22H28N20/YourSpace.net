import { logoutUser, requireSameOrigin } from "@/lib/backend";

export async function POST(request: Request) {
  const originError = requireSameOrigin(request);
  if (originError) {
    return originError;
  }

  // Logout just clears the session cookie and deletes the stored token.
  return logoutUser();
}