import crypto from "node:crypto";
import argon2 from "argon2";

// Cookie name shared by login, register, and logout handlers.
export const SESSION_COOKIE_NAME = "lastterm_session";
// CSRF token cookie name for form protection (not yet implemented)
export const CSRF_TOKEN_NAME = "lastterm_csrf";
// Session expiration time: 7 days
const SESSION_TTL_DAYS = 7;

// Normalize username for case-insensitive lookups and prevent duplicate variations.
export function normalizeUsername(value: string) {
  return value.trim().toLowerCase();
}

// Normalize email for consistent case-insensitive lookups.
export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

// Generate a cryptographically secure random session token (32 bytes = 256 bits).
// The raw token is sent to the client in a cookie; the hash is stored in the database.
export function createSessionToken() {
  return crypto.randomBytes(32).toString("hex");
}

// Generate a CSRF token to protect forms against cross-site request forgery attacks.
export function createCsrfToken() {
  return crypto.randomBytes(32).toString("hex");
}

// Hash session token using SHA-256 before storing in database.
// This prevents session token reuse if the database is compromised.
export function hashSessionToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// Hash CSRF token before storing for verification during form submissions.
export function hashCsrfToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// Hash password using Argon2id - slow and memory-hard algorithm resistant to GPU/ASIC attacks.
// This makes offline password cracking computationally infeasible.
export async function hashPassword(password: string) {
  return argon2.hash(password, { type: argon2.argon2id });
}

// Verify plaintext password against stored Argon2 hash.
// Uses constant-time comparison to prevent timing attacks.
export async function verifyPassword(hash: string, password: string) {
  return argon2.verify(hash, password);
}

// Calculate session expiration time: 7 days from now.
// Sessions can be refreshed by user activity to implement rolling expiry.
export function getSessionExpiry() {
  return new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
}

// Calculate CSRF token expiration time: 1 hour from now.
// Short-lived to minimize the window for token theft.
export function getCsrfTokenExpiry() {
  return new Date(Date.now() + 60 * 60 * 1000);
}