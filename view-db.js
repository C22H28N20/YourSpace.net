const Database = require('better-sqlite3');
const db = new Database('dev.db');

console.log('=== USERS ===');
const users = db.prepare('SELECT user_id, username, user_email FROM "User"').all();
console.log(JSON.stringify(users, null, 2));

console.log('\n=== USER PROFILES ===');
const profiles = db.prepare('SELECT user_id, bio FROM user_profile').all();
console.log(JSON.stringify(profiles, null, 2));

console.log('\n=== FRIEND REQUESTS ===');
const requests = db.prepare('SELECT request_id, sender_id, recipient_id, status FROM friend_requests').all();
console.log(JSON.stringify(requests, null, 2));

db.close();
