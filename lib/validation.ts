import { z } from "zod";

// ===== USERNAME VALIDATION =====
// Username validation schema: 3-24 chars, alphanumeric with underscore and hyphen only.
// Case is normalized to lowercase for uniqueness checking.
const usernameSchema = z
  .string()
  .trim()
  .min(3, "Username must be at least 3 characters")
  .max(24, "Username must be at most 24 characters")
  .regex(/^[a-zA-Z0-9_\-]+$/, "Username can only use letters, numbers, underscore, and hyphen");

// ===== AUTHENTICATION SCHEMAS =====

// Schema for user registration: username, email, and password.
// All three fields are required and validated for format and length.
export const registerSchema = z.object({
  username: usernameSchema,
  email: z.string().trim().email("Invalid email address").toLowerCase(),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be at most 128 characters")
});

// Schema for user login: accepts either email or username plus password.
// Identifier field supports both login methods.
export const loginSchema = z.object({
  identifier: z.string().trim().min(1, "Email or username is required").max(255),
  password: z.string().min(1, "Password is required").max(128)
});

// ===== PROFILE MANAGEMENT SCHEMAS =====

export const colorBlindModeSchema = z.enum([
  "default",
  "protanopia",
  "deuteranopia",
  "tritanopia",
  "monochrome",
  "high-contrast"
]);

// Schema for updating user profile: all fields are optional for flexibility.
// Allows partial updates of profile information.
export const updateProfileSchema = z.object({
  username: usernameSchema.optional(),
  bio: z.string().max(280, "Bio must be at most 280 characters").optional(),
  headerImageId: z.number().int().positive().optional(),
  profileImageId: z.number().int().positive().optional(),
  colorBlindMode: colorBlindModeSchema.optional(),
  headerImageX: z.number().optional(),
  headerImageY: z.number().optional(),
  headerImageScale: z.number().min(0.5).max(3).optional(),
  

  nowPlaying: z.string().max(120, "Now playing must be at most 120 characters").optional()
});

// Schema for changing password: validates current and new passwords.
// New password must meet minimum length requirements.
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required").max(128),
  newPassword: z.string()
    .min(8, "New password must be at least 8 characters")
    .max(128, "New password must be at most 128 characters")
});

// ===== ROOM MANAGEMENT SCHEMAS =====

// Schema for creating chatrooms: name and optional visibility flag.
// Visibility: 0 = private, 1 = public
export const createRoomSchema = z.object({
  name: z.string().trim().min(3, "Room name must be at least 3 characters").max(60, "Room name must be at most 60 characters"),
  visibility: z.union([z.literal(0), z.literal(1)]).optional()
});

// ===== MESSAGE SCHEMAS =====

// Schema for sending messages: supports plain text and future message types.
// Content is required; recipient and kind are optional for flexibility.
export const sendMessageSchema = z.object({
  content: z.string().trim().min(1, "Message content is required").max(4000, "Message must be at most 4000 characters"),
  recipientId: z.number().int().positive().optional(),
  kind: z.enum(["text", "file", "system"]).optional()
});

// ===== SOCIAL INTERACTION SCHEMAS =====

// Schema for inviting users to rooms/groups by username.
export const inviteSchema = z.object({
  username: usernameSchema
});

// Schema for sending friend requests by recipient user ID.
export const friendRequestSchema = z.object({
  recipientId: z.number().int().positive("Recipient user ID is required")
});

// Schema for blocking users by username.
export const blockSchema = z.object({
  username: usernameSchema
});

// ===== IMAGE MANAGEMENT SCHEMAS =====

// Schema for creating image type categories.
export const imageTypeSchema = z.object({
  name: z.string().trim().min(1, "Image type name is required").max(60, "Image type name must be at most 60 characters")
});

// Schema for uploading/referencing images: source URL and optional category.
// Source must be a valid URL to prevent malicious input.
// File type must be an image or gif.
export const imageSchema = z.object({
  source: z.string().trim().min(1, "Image source is required").max(1000, "Image source must be at most 1000 characters").url("Invalid image URL").refine(
    (url) => {
      try {
        const urlObj = new URL(url);
        const pathname = urlObj.pathname.toLowerCase();
        const supportedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
        const hasSupportedExtension = supportedExtensions.some(ext => pathname.endsWith(ext));
        return hasSupportedExtension;
      } catch {
        return false;
      }
    },
    "Image must be a valid image file (JPG, JPEG, PNG, GIF, WEBP, or SVG)"
  ),
  imageTypeId: z.number().int().positive().optional()
});