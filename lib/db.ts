import Database from "better-sqlite3";
import { mkdirSync } from "fs";
import path from "path";
import { readFileSync } from "fs";

// Resolve database path - handle relative paths and file: URLs used in Railway.
const rawDatabaseUrl = process.env.DATABASE_URL ?? "dev.db";
let dbPath = rawDatabaseUrl.startsWith("file:")
  ? rawDatabaseUrl.replace(/^file:(\/\/)?/, "")
  : rawDatabaseUrl;

dbPath = path.normalize(dbPath);

if (!path.isAbsolute(dbPath)) {
  dbPath = path.join(process.cwd(), dbPath);
}

mkdirSync(path.dirname(dbPath), { recursive: true });

console.log("[DB] Resolved path:", dbPath);

let db: Database.Database | null = null;
let initialized = false;

function initializeDatabase() {
  // Skip initialization during Next.js build
  if (process.env.NEXT_PHASE === "phase-production-build") {
    console.log("[DB] Skipping initialization during build phase");
    return;
  }

  if (initialized) return;
  initialized = true;

  try {
    if (process.env.NODE_ENV === "production") {
      db = new Database(dbPath, { timeout: 10000 });
    } else {
      const globalDb = globalThis as any;
      if (!globalDb._db) {
        globalDb._db = new Database(dbPath, { timeout: 10000 });
        console.log("[DB] Database opened successfully");
      }
      db = globalDb._db;
    }

    if (!db) {
      throw new Error("Failed to initialize database");
    }

    // Enable write-ahead logging and enforce foreign-key checks
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");

    // Initialize schema if needed
    try {
      const tables = db.prepare(`SELECT name FROM sqlite_master WHERE type='table'`).all() as Array<{ name: string }>;
      const tableNames = new Set(tables.map((t) => t.name));

      if (!tableNames.has("User")) {
        console.log("[DB] Initializing schema from database/schema.sql");
        const schemaPath = path.join(process.cwd(), "database", "schema.sql");
        const schema = readFileSync(schemaPath, "utf-8");
        db.exec(schema);
        console.log("[DB] Schema initialized successfully");
      }
    } catch (err) {
      console.error("[DB] Failed to initialize schema:", err);
      throw err;
    }

    // Lightweight migration: ensure expected columns exist
    try {
      // Check and add missing columns to User table
      const userCols = db.prepare("PRAGMA table_info(\"User\")").all() as Array<{ name: string }>;
      const userColSet = new Set(userCols.map((c) => c.name));

      if (!userColSet.has("is_admin")) {
        try {
          db.prepare(`ALTER TABLE "User" ADD COLUMN is_admin INTEGER DEFAULT 0`).run();
          console.log(`[DB] Added missing column User.is_admin`);
        } catch (err) {
          console.warn(`[DB] Failed adding is_admin column:`, err);
        }
      }

      // Check and add missing columns to user_profile table
      const existing = db.prepare("PRAGMA table_info(user_profile)").all() as Array<{ name: string }>;
      const cols = new Set(existing.map((c) => c.name));

      const ensure = (name: string, def: string) => {
        if (!cols.has(name)) {
          try {
            db!.prepare(`ALTER TABLE user_profile ADD COLUMN ${name} ${def}`).run();
            console.log(`[DB] Added missing column user_profile.${name}`);
          } catch (err) {
            console.warn(`[DB] Failed adding column ${name}:`, err);
          }
        }
      };

      ensure("header_img", "INTEGER");
      ensure("profile_img", "INTEGER");
      ensure("header_img_x", "REAL DEFAULT 0");
      ensure("header_img_y", "REAL DEFAULT 0");
      ensure("header_img_scale", "REAL DEFAULT 1");
      ensure("profile_img_x", "REAL DEFAULT 0");
      ensure("profile_img_y", "REAL DEFAULT 0");
      ensure("profile_img_scale", "REAL DEFAULT 1");
    } catch (err) {
      console.warn("[DB] Migration check failed:", err);
    }

    // No one-time startup hooks active.
  } catch (err) {
    console.error("[DB] Failed to open database:", err);
    throw err;
  }
}

// Lazy initialization on first use
function getDb(): Database.Database {
  if (!db) {
    initializeDatabase();
  }
  if (!db) {
    throw new Error("[DB] Database not initialized");
  }
  return db;
}

// Create a proxy object that initializes the database on first access and properly binds methods
const dbProxy = new Proxy({} as Database.Database, {
  get: (target, prop) => {
    const instance = getDb();
    const value = (instance as any)[prop];
    // Bind methods to the database instance to preserve context
    if (typeof value === "function") {
      return value.bind(instance);
    }
    return value;
  }
});

export { dbProxy as db };