PRAGMA foreign_keys = ON;

-- Images and types
CREATE TABLE IF NOT EXISTS image_types(
    image_type_id INTEGER PRIMARY KEY AUTOINCREMENT,
    image_type_name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS images (
    image_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    image_source TEXT NOT NULL,
    image_type_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES "User"(user_id),
    FOREIGN KEY (image_type_id) REFERENCES image_types(image_type_id)
);

-- Users
CREATE TABLE IF NOT EXISTS "User" ( 
    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    user_email TEXT NOT NULL UNIQUE,
    user_password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Profile
CREATE TABLE IF NOT EXISTS user_profile (
    user_id INTEGER PRIMARY KEY,
    bio TEXT,
    header_img INTEGER,
    profile_img INTEGER,
    color_blind_mode TEXT DEFAULT 'default',
    header_img_x REAL DEFAULT 0,
    header_img_y REAL DEFAULT 0,
    header_img_scale REAL DEFAULT 1,
    profile_img_x REAL DEFAULT 0,
    profile_img_y REAL DEFAULT 0,
    profile_img_scale REAL DEFAULT 1,
    FOREIGN KEY (user_id) REFERENCES "User"(user_id),
    FOREIGN KEY (header_img) REFERENCES images (image_id),
    FOREIGN KEY (profile_img) REFERENCES images(image_id)
);

-- Friend list (unique pair)
CREATE TABLE IF NOT EXISTS Friendlist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_1_id INTEGER NOT NULL,
    user_2_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_1_id) REFERENCES "User" (user_id),
    FOREIGN KEY (user_2_id) REFERENCES "User" (user_id),
    UNIQUE(user_1_id, user_2_id)
);

-- Messages
CREATE TABLE IF NOT EXISTS messages (
    msg_id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id INTEGER,
    content TEXT,
    msg_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES "User"(user_id)
);

-- Chatrooms (user/message lists stored as JSON text)
CREATE TABLE IF NOT EXISTS Chatroom(
    chatroom_id INTEGER PRIMARY KEY AUTOINCREMENT,
    chatroom_name TEXT NOT NULL,
    chatroom_slug TEXT NOT NULL UNIQUE,
    chatroom_user_list TEXT,
    chatroom_size INTEGER DEFAULT 0,
    chatroom_public_private INTEGER DEFAULT 1,
    chatroom_msg TEXT,
    chatroom_owner_id INTEGER,
    FOREIGN KEY (chatroom_owner_id) REFERENCES "User"(user_id)
);

-- Private message mapping (references messages table)
CREATE TABLE IF NOT EXISTS private_msg(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id INTEGER NOT NULL,
    recipient_id INTEGER NOT NULL,
    msg_id INTEGER NOT NULL,
    FOREIGN KEY (sender_id) REFERENCES "User"(user_id),
    FOREIGN KEY (recipient_id) REFERENCES "User"(user_id),
    FOREIGN KEY (msg_id) REFERENCES messages(msg_id)
);

-- Sessions for cookie/session-based auth
CREATE TABLE IF NOT EXISTS sessions (
    session_id INTEGER PRIMARY KEY AUTOINCREMENT,
    token_hash TEXT NOT NULL UNIQUE,
    user_id INTEGER NOT NULL,
    expires_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES "User"(user_id)
);

-- Presence / online users
CREATE TABLE IF NOT EXISTS user_presence (
    user_presence_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE,
    last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'online',
    FOREIGN KEY (user_id) REFERENCES "User"(user_id)
);

-- Friend requests
CREATE TABLE IF NOT EXISTS friend_requests (
    request_id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id INTEGER NOT NULL,
    recipient_id INTEGER NOT NULL,
    message TEXT,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES "User"(user_id),
    FOREIGN KEY (recipient_id) REFERENCES "User"(user_id),
    UNIQUE (sender_id, recipient_id)
);

-- Blocks
CREATE TABLE IF NOT EXISTS blocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    blocker_id INTEGER NOT NULL,
    blocked_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (blocker_id) REFERENCES "User"(user_id),
    FOREIGN KEY (blocked_id) REFERENCES "User"(user_id),
    UNIQUE (blocker_id, blocked_id)
);

-- Room invites
CREATE TABLE IF NOT EXISTS room_invites (
    invite_id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id INTEGER NOT NULL,
    sender_id INTEGER NOT NULL,
    recipient_id INTEGER NOT NULL,
    message TEXT,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES Chatroom(chatroom_id),
    FOREIGN KEY (sender_id) REFERENCES "User"(user_id),
    FOREIGN KEY (recipient_id) REFERENCES "User"(user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_images_type ON images(image_type_id);
CREATE INDEX IF NOT EXISTS idx_images_user ON images(user_id);
CREATE INDEX IF NOT EXISTS idx_friendlist_user1 ON Friendlist(user_1_id);
CREATE INDEX IF NOT EXISTS idx_friendlist_user2 ON Friendlist(user_2_id);
CREATE INDEX IF NOT EXISTS idx_private_msg_sender ON private_msg(sender_id);
CREATE INDEX IF NOT EXISTS idx_private_msg_recipient ON private_msg(recipient_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_presence_user ON user_presence(user_id);