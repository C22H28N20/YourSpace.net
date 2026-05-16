import { NextResponse } from "next/server";
import { attachSessionCookie, badRequestResponse, internalErrorResponse, loginUser, requireSameOrigin, unauthorizedResponse } from "@/lib/backend";
import { loginSchema } from "@/lib/validation";

// Simple in-memory rate limiting to prevent brute force attacks.
// In production, this should use Redis or a database for persistence across server instances.
const loginAttempts = new Map<string, { count: number; resetTime: number }>();

// Check if login attempt is allowed under rate limit.
// Max 5 attempts per identifier (email/username) in 15 minutes.
function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const record = loginAttempts.get(identifier);

  if (record) {
    // Reset the rate limit if the window has expired
    if (now > record.resetTime) {
      loginAttempts.delete(identifier);
      return true;
    }
    // Reject if max attempts reached
    if (record.count >= 5) {
      return false;
    }
    record.count++;
  } else {
    // Create new rate limit record (expires in 15 minutes)
    loginAttempts.set(identifier, { count: 1, resetTime: now + 15 * 60 * 1000 });
  }
  return true;
}

// POST /api/auth/login - Authenticate user and create session.
export async function POST(request: Request) {
  const originError = requireSameOrigin(request);
  if (originError) {
    return originError;
  }

  try {
    const body = await request.json();
    // Validate request against schema (checks types, lengths, formats)
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return badRequestResponse(parsed.error.issues[0]?.message ?? "Invalid login data");
    }

    // Rate limiting to prevent brute force attacks (5 attempts per 15 minutes)
    if (!checkRateLimit(parsed.data.identifier)) {
      return internalErrorResponse("Too many login attempts. Please try again later.");
    }

    // Authenticate user and create session token
    const { user, token } = await loginUser(parsed.data);
    console.log(`[LOGIN] User ${user.username} authenticated, token created`);
    
    // Clear rate limit on successful login
    loginAttempts.delete(parsed.data.identifier);
    
    // Attach session cookie to response (httpOnly, secure, sameSite)
    const response = attachSessionCookie(NextResponse.json({ user }), token);
    console.log(`[LOGIN] Session cookie attached for user ${user.username}`);
    
    return response;
  } catch (error) {
    // Log the actual error for diagnostics
    console.error('[LOGIN] Error during authentication:', error);

    // If the error indicates invalid credentials, return 401 instead of 500
    if (error instanceof Error && error.message === 'INVALID_LOGIN') {
      return unauthorizedResponse();
    }

    return internalErrorResponse("Invalid credentials");
  }
}