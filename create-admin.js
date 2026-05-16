const Database = require('better-sqlite3');
const argon2 = require('argon2');
const path = require('path');

const rawDatabaseUrl = process.env.DATABASE_URL || 'dev.db';
let dbPath = rawDatabaseUrl.startsWith('file:') ? rawDatabaseUrl.replace(/^file:(\/\/)?/, '') : rawDatabaseUrl;
dbPath = path.normalize(dbPath);

if (!path.isAbsolute(dbPath)) {
  dbPath = path.join(process.cwd(), dbPath);
}

const db = new Database(dbPath);

// Add is_admin column if it doesn't exist
try {
  db.prepare(`ALTER TABLE "User" ADD COLUMN is_admin INTEGER DEFAULT 0`).run();
  console.log('✓ Added is_admin column to User table');
} catch (e) {
  console.log('✓ is_admin column already exists');
}

// Create admin user
const username = 'admin';
const email = 'admin@lasttermproject.net';
const password = 'admin12345';

(async () => {
  try {
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    const now = new Date().toISOString();

    const existing = db.prepare(`SELECT user_id FROM "User" WHERE username = ? OR user_email = ? LIMIT 1`).get(username, email);

    let user;
    if (existing) {
      db.prepare(`UPDATE "User" SET username = ?, user_email = ?, user_password = ?, is_admin = 1 WHERE user_id = ?`).run(
        username,
        email,
        passwordHash,
        existing.user_id
      );
      user = { user_id: existing.user_id, username, user_email: email };
      console.log('✓ Admin user already existed, credentials reset');
    } else {
      // Create admin user
      user = db.prepare(`
        INSERT INTO "User" (username, user_email, user_password, is_admin, created_at)
        VALUES (?, ?, ?, 1, ?)
        RETURNING user_id, username, user_email
      `).get(username, email, passwordHash, now);

      console.log('\n✓ Admin user created successfully!');
    }
    console.log('═════════════════════════════════════════');
    console.log(`Username: ${username}`);
    console.log(`Email:    ${email}`);
    console.log(`Password: ${password}`);
    console.log('═════════════════════════════════════════\n');
    console.log('⚠️  SAVE THIS PASSWORD SOMEWHERE SAFE!\n');

    // Create profile and presence
    db.prepare(`INSERT INTO user_profile (user_id) VALUES (?) ON CONFLICT(user_id) DO NOTHING`).run(user.user_id);
    db.prepare(`
      INSERT INTO user_presence (user_id, last_seen, status)
      VALUES (?, ?, 'online')
      ON CONFLICT(user_id) DO UPDATE SET last_seen = excluded.last_seen, status = excluded.status
    `).run(user.user_id, now);

    console.log('✓ You can now login at /auth');
    console.log('✓ View the database at /admin/database (when logged in)');

    db.close();
  } catch (error) {
    console.error('✗ Error creating admin user:', error.message);
    db.close();
    process.exit(1);
  }
})();
