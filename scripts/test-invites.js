(async () => {
  const base = 'http://localhost:3002';
  // Login as admin to create a room and send invite
  const loginRes = await fetch(base + '/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: base },
    body: JSON.stringify({ identifier: 'admin', password: 'Admin@12345' })
  });
  const loginBody = await loginRes.json();
  console.log('ADMIN LOGIN', loginRes.status, loginBody.user?.id);
  const adminCookie = loginRes.headers.get('set-cookie')?.split(';')[0];

  // Create a room as admin
  const createRes = await fetch(base + '/api/rooms', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: base, Cookie: adminCookie },
    body: JSON.stringify({ name: 'Test Room', visibility: 1 })
  });
  const roomResp = await createRes.json();
  const roomIdVal = roomResp.room?.id ?? roomResp.id ?? roomResp.roomId;
  console.log('CREATE ROOM', createRes.status, roomResp);

  // Invite tempuser
  const inviteRes = await fetch(base + `/api/rooms/${roomIdVal}/invites`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: base, Cookie: adminCookie },
    body: JSON.stringify({ username: 'tempuser' })
  });
  const inviteText = await inviteRes.text();
  console.log('INVITE', inviteRes.status, inviteText);

  // Login as tempuser to list invites
  const tLogin = await fetch(base + '/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: base },
    body: JSON.stringify({ identifier: 'tempuser', password: 'Password123!' })
  });
  const tempCookie = tLogin.headers.get('set-cookie')?.split(';')[0];
  console.log('TEMP LOGIN', tLogin.status);

  const listRes = await fetch(base + '/api/invites', { method: 'GET', headers: { Origin: base, Cookie: tempCookie } });
  const listText = await listRes.text();
  console.log('LIST INVITES', listRes.status, listText);

  // If there's an invite, accept it
  if (listRes.ok) {
    const data = JSON.parse(listText);
    const first = data.invites?.[0];
    if (first) {
      const patch = await fetch(base + `/api/invites/${first.invite_id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', Origin: base, Cookie: tempCookie },
        body: JSON.stringify({ status: 'accepted' })
      });
      console.log('ACCEPT', patch.status, await patch.text());
    }
  }
})();