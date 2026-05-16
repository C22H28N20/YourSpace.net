import { NextResponse } from "next/server";
import { attachSessionCookie, badRequestResponse, internalErrorResponse, registerUser, requireSameOrigin } from "@/lib/backend";
import { registerSchema } from "@/lib/validation";

// Simple in-memory rate limiting to prevent spam registrations.
// In production, this should use Redis or a database for persistence across server instances.
const registerAttempts = new Map<string, { count: number; resetTime: number }>();

// Check if registration attempt is allowed under rate limit.
// Max 10 attempts per email in 60 minutes to prevent spam account creation.
function checkRateLimit(ipOrIdentifier: string): boolean {
  const now = Date.now();
  const record = registerAttempts.get(ipOrIdentifier);

  if (record) {
    // Reset the rate limit if the window has expired
    if (now > record.resetTime) {
      registerAttempts.delete(ipOrIdentifier);
      return true;
    }
    // Reject if max attempts reached
    if (record.count >= 10) {
      return false;
    }
    record.count++;
  } else {
    // Create new rate limit record (expires in 60 minutes)
    registerAttempts.set(ipOrIdentifier, { count: 1, resetTime: now + 60 * 60 * 1000 });
  }
  return true;
}

// POST /api/auth/register - Create new user account and establish session.
export async function POST(request: Request) {
  const originError = requireSameOrigin(request);
  if (originError) {
    return originError;
  }

  try {
    const body = await request.json();
    // Validate request against schema (checks types, lengths, formats, email validity)
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return badRequestResponse(parsed.error.issues[0]?.message ?? "Invalid registration data");
    }

    // Rate limiting to prevent spam registrations (10 attempts per 60 minutes per email)
    if (!checkRateLimit(parsed.data.email)) {
      return internalErrorResponse("Too many registration attempts. Please try again later.");
    }

    // Create new user account and session
    const { user, token } = await registerUser(parsed.data);
    // Clear rate limit on successful registration
    registerAttempts.delete(parsed.data.email);
    // Attach session cookie to response (httpOnly, secure, sameSite)
    return attachSessionCookie(NextResponse.json({ user }), token);
  } catch (error) {
    console.error("[REGISTER] Error:", error);
    // Generic error when duplicate exists to prevent information leakage
    if (error instanceof Error && error.message === "USER_EXISTS") {
      return badRequestResponse("Email or username already in use");
    }

    return internalErrorResponse("Registration failed. Please try again later.");
  }
}