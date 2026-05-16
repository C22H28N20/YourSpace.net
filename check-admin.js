const path = require('path');

const rawDatabaseUrl = process.env.DATABASE_URL || 'dev.db';
let dbPath = rawDatabaseUrl.startsWith('file:') ? rawDatabaseUrl.replace(/^file:(\/\/)?/, '') : rawDatabaseUrl;
dbPath = path.normalize(dbPath);

if (!path.isAbsolute(dbPath)) {
	dbPath = path.join(process.cwd(), dbPath);
}

const db = require('better-sqlite3')(dbPath);
const admin = db.prepare(`SELECT user_id, username, is_admin FROM "User" WHERE username = ?`).get('admin');
console.log('Admin user:', JSON.stringify(admin, null, 2));
db.close();
