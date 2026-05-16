(async () => {
  const base = 'http://localhost:3002';
  // Register a temp user (ignore errors if exists)
  try {
    const res = await fetch(base + '/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: base },
      body: JSON.stringify({ username: 'tempuser', email: 'tempuser@example.com', password: 'Password123!' })
    });
    console.log('REGISTER', res.status, await res.text());
  } catch (e) { console.error('Register error', e.message); }

  // Login
  const loginRes = await fetch(base + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: base },
    body: JSON.stringify({ identifier: 'tempuser', password: 'Password123!' })
  });
  console.log('LOGIN', loginRes.status);
  const loginText = await loginRes.text();
  console.log('LOGIN BODY', loginText);
  const setCookie = loginRes.headers.get('set-cookie');
  console.log('SET-COOKIE', setCookie);

  // Use cookie to GET messages
  const headers = { Origin: base };
  if (setCookie) headers['Cookie'] = setCookie.split(';')[0];

  const msgRes = await fetch(base + '/api/rooms/1/messages', { method: 'GET', headers });
  console.log('MESSAGES', msgRes.status, await msgRes.text());
})();