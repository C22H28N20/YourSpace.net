(async () => {
  const base = 'http://localhost:3003';
  try {
    const loginRes = await fetch(base + '/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Origin: base },
      body: JSON.stringify({ identifier: 'admin', password: 'Admin@12345' })
    });
    const loginText = await loginRes.text();
    console.log('LOGIN', loginRes.status, loginText);
    const adminCookie = loginRes.headers.get('set-cookie')?.split(';')[0];
    console.log('SET-COOKIE:', adminCookie);

      const meRes = await fetch(base + '/api/auth/me', { headers: { Origin: base, Cookie: adminCookie } });
      console.log('/api/auth/me', meRes.status, await meRes.text());

    const inviteRes = await fetch(base + '/api/rooms/1/invites', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Origin: base, Cookie: adminCookie },
      body: JSON.stringify({ username: 'tempuser' })
    });
    const inviteText = await inviteRes.text();
    console.log('INVITE', inviteRes.status, inviteText);
  } catch (e) {
    console.error('ERROR', e);
  }
})();