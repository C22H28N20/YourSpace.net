# API Endpoints Reference

Base URL: `http://localhost:3001`

All responses are JSON. Authentication uses `lastterm_session` cookie.

---

## Auth (No auth required)

### Register User
```
POST /api/auth/register
Content-Type: application/json

{
  "username": "scene_legend",
  "email": "user@example.com",
  "password": "password123"
}

Response: { "user": { "id": 1, "username": "...", "email": "..." } }
```

### Login
```
POST /api/auth/login
Content-Type: application/json

{
  "identifier": "scene_legend",  // username or email
  "password": "password123"
}

Response: { "user": { "id": 1, "username": "...", "email": "..." } }
Sets: lastterm_session cookie
```

### Logout
```
POST /api/auth/logout

Response: { "ok": true }
Clears: lastterm_session cookie
```

### Get Current User
```
GET /api/auth/me

Response: { "user": { "id": 1, "username": "...", "email": "..." } }
```

---

## Users (Auth required)

### Get User Profile
```
GET /api/users/[username]

Response: { "user": { "id": 1, "username": "...", "email": "...", "profile": { ... } } }
```

### Update Password
```
POST /api/users/me/password
Content-Type: application/json

{
  "currentPassword": "oldpass",
  "newPassword": "newpass"
}

Response: { "ok": true }
```

### List Online Users
```
GET /api/users/online

Response: { "users": [ { "id": 1, "username": "...", "isOnline": true, "lastSeenAt": "2026-04-28T..." } ] }
```

### Mark Online (Heartbeat)
```
POST /api/users/online

Response: { "ok": true }
```

---

## Rooms (Auth required)

### Create Room
```
POST /api/rooms
Content-Type: application/json

{
  "name": "general",
  "visibility": 1  // 1=public, 0=private (optional)
}

Response: { "room": { "id": 1, "name": "...", "slug": "...", "ownerId": 1, ... } }
```

### List My Rooms
```
GET /api/rooms

Response: { "rooms": [ { "id": 1, "name": "...", "memberIds": [1,2,3], ... } ] }
```

### Get Room Details
```
GET /api/rooms/[roomId or slug]

Response: { "room": { "id": 1, "name": "...", "messages": [ { "id": 1, "senderId": 1, "content": "..." } ] } }
```

### Delete Room
```
DELETE /api/rooms/[roomId]

Response: { "ok": true }
```

---

## Messages (Auth required, must be room member)

### Send Message
```
POST /api/rooms/[roomId]/messages
Content-Type: application/json

{
  "content": "Hello everyone!",
  "kind": "text"  // optional
}

Response: { "message": { "id": 1, "senderId": 1, "content": "...", "timestamp": "..." } }
```

### Get Messages
```
GET /api/rooms/[roomId]/messages?limit=50

Response: { "messages": [ { "id": 1, "senderId": 1, "content": "...", "timestamp": "..." } ] }
```

---

## Room Invites (Auth required)

### Send Room Invite
```
POST /api/rooms/[roomId]/invites
Content-Type: application/json

{
  "username": "friend_username"
}

Response: { "invite": { "id": 1, "chatroomId": 1, "senderId": 1, "recipientId": 2, "status": "pending" } }
```

### List My Room Invites
```
GET /api/invites

Response: { "invites": [ { "id": 1, "chatroomId": 1, "senderId": 1, "status": "pending" } ] }
```

### Accept/Decline Room Invite
```
POST /api/invites/[inviteId]
Content-Type: application/json

{
  "status": "accepted"  // "accepted" or "declined"
}

Response: { "invite": { "id": 1, "status": "accepted" } }
```

---

## Friend Requests (Auth required)

### Send Friend Request
```
POST /api/friends/requests
Content-Type: application/json

{
  "username": "friend_username"
}

Response: { "request": { "id": 1, "senderId": 1, "recipientId": 2, "status": "pending" } }
```

### List Friend Requests
```
GET /api/friends/requests

Response: { "requests": [ { "id": 1, "senderId": 1, "recipientId": 2, "status": "pending" } ] }
```

### Accept/Decline Friend Request
```
POST /api/friends/requests/[requestId]
Content-Type: application/json

{
  "status": "accepted"  // "accepted" or "declined"
}

Response: { "request": { "id": 1, "status": "accepted" } }
```

### List Friends
```
GET /api/friends

Response: { "friends": [ { "id": 2, "username": "...", "email": "..." } ] }
```

---

## Blocks (Auth required)

### Block User
```
POST /api/blocks
Content-Type: application/json

{
  "username": "user_to_block"
}

Response: { "block": { "blockerId": 1, "blockedUserId": 2 } }
```

### List Blocked Users
```
GET /api/blocks

Response: { "blocks": [ { "blockerId": 1, "blockedUserId": 2, "blockedUser": { "id": 2, "username": "..." } } ] }
```

### Unblock User
```
DELETE /api/blocks/[blockedUserId]

Response: { "ok": true }
```

---

## Private Messages (Auth required)

### List Conversations
```
GET /api/messages

Response: { "conversations": [ { "userId": 2, "username": "...", "lastMessageTime": "2026-...", "lastMessageId": 1 } ] }
```

### Send Private Message
```
POST /api/messages
Content-Type: application/json

{
  "content": "Hello!",
  "recipientId": 2,
  "kind": "text"  // optional
}

Response: { "message": { "id": 1, "senderId": 1, "content": "...", "timestamp": "...", "sender": { "id": 1, "username": "..." } } }
```

### Get Conversation with User
```
GET /api/messages/[userId]

Response: { "messages": [ { "id": 1, "senderId": 1, "content": "...", "timestamp": "...", "sender": { "id": 1, "username": "..." } } ] }
```


---

## Error Responses

### 400 Bad Request
```json
{ "error": "Invalid input" }
```

### 401 Unauthorized
```json
{ "error": "Unauthorized" }
```

### 409 Conflict
```json
{ "error": "Username or email already exists" }
```

### 500 Internal Error
```json
{ "error": "Something went wrong" }
```

---

## Testing with PowerShell
```powershell
$body = @{username="test";email="test@example.com";password="pass123"} | ConvertTo-Json
$response = Invoke-WebRequest -Uri "http://localhost:3001/api/auth/register" -Method POST -ContentType "application/json" -Body $body -UseBasicParsing
$response.Content | ConvertFrom-Json
```

## Testing with JavaScript/React
```javascript
// Register
const res = await fetch('http://localhost:3001/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'test', email: 'test@example.com', password: 'pass123' }),
  credentials: 'include'
});
const data = await res.json();

// Subsequent requests include session cookie automatically with credentials: 'include'
```
