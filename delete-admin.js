const Database = require('better-sqlite3');
const path = require('path');

const rawDatabaseUrl = process.env.DATABASE_URL || 'dev.db';
let dbPath = rawDatabaseUrl.startsWith('file:') ? rawDatabaseUrl.replace(/^file:(\/\/)?/, '') : rawDatabaseUrl;
dbPath = path.normalize(dbPath);

if (!path.isAbsolute(dbPath)) {
  dbPath = path.join(process.cwd(), dbPath);
}

const db = new Database(dbPath);

try {
  // Get admin user ID
  const admin = db.prepare(`SELECT user_id FROM "User" WHERE username = 'admin'`).get();
  
  if (!admin) {
    console.log('✗ Admin user not found');
    db.close();
    process.exit(0);
  }

  const adminId = admin.user_id;
  console.log(`Found admin user with ID: ${adminId}`);

  // Delete in order of dependencies
  db.prepare(`DELETE FROM sessions WHERE user_id = ?`).run(adminId);
  console.log('✓ Deleted sessions');

  db.prepare(`DELETE FROM user_presence WHERE user_id = ?`).run(adminId);
  console.log('✓ Deleted presence');

  db.prepare(`DELETE FROM user_profile WHERE user_id = ?`).run(adminId);
  console.log('✓ Deleted profile');

  db.prepare(`DELETE FROM Friendlist WHERE user_1_id = ? OR user_2_id = ?`).run(adminId, adminId);
  console.log('✓ Deleted friendships');

  db.prepare(`DELETE FROM blocks WHERE blocker_id = ? OR blocked_id = ?`).run(adminId, adminId);
  console.log('✓ Deleted blocks');

  db.prepare(`DELETE FROM private_msg WHERE sender_id = ? OR recipient_id = ?`).run(adminId, adminId);
  console.log('✓ Deleted private messages');

  db.prepare(`DELETE FROM messages WHERE sender_id = ?`).run(adminId);
  console.log('✓ Deleted messages');

  db.prepare(`DELETE FROM Chatroom WHERE chatroom_owner_id = ?`).run(adminId);
  console.log('✓ Deleted chatrooms');

  // Finally delete the user
  const result = db.prepare(`DELETE FROM "User" WHERE user_id = ?`).run(adminId);
  
  if (result.changes > 0) {
    console.log('✓ Admin user deleted successfully');
  } else {
    console.log('✗ Failed to delete admin user');
  }
} catch (e) {
  console.error('✗ Error:', e.message);
} finally {
  db.close();
}
