export async function createSession(env, sessionId, region, ip) {
  const session = {
    region,
    startedAt: new Date().toISOString(),
    ip,
  };

  // Store session with 60-min TTL
  await env.SESSIONS.put(`session:${sessionId}`, JSON.stringify(session), {
    expirationTtl: 3600,
  });

  // Track active session by IP
  await env.CACHE.put(`active:${ip}`, sessionId, { expirationTtl: 3600 });

  // Append to active-sessions list for cron expiry tracking
  // Include ip so cron can clean up the active:${ip} lock for zombie sessions
  const listRaw = await env.CACHE.get('active-sessions', 'json');
  const list = listRaw || { sessions: [] };
  list.sessions.push({ id: sessionId, region, ip });
  await env.CACHE.put('active-sessions', JSON.stringify(list));
}

export async function endSession(env, sessionId) {
  const raw = await env.SESSIONS.get(`session:${sessionId}`);
  if (!raw) return null;

  const session = JSON.parse(raw);
  const duration = Math.floor(
    (Date.now() - new Date(session.startedAt).getTime()) / 1000
  );

  // Clean up session
  await env.SESSIONS.delete(`session:${sessionId}`);
  if (session.ip) {
    await env.CACHE.delete(`active:${session.ip}`);
  }

  // Remove from active-sessions list
  const listRaw = await env.CACHE.get('active-sessions', 'json');
  if (listRaw && listRaw.sessions) {
    listRaw.sessions = listRaw.sessions.filter((s) => s.id !== sessionId);
    await env.CACHE.put('active-sessions', JSON.stringify(listRaw));
  }

  return { region: session.region, duration };
}

export async function expireSessions(env) {
  const listRaw = await env.CACHE.get('active-sessions', 'json');
  if (!listRaw || !listRaw.sessions || listRaw.sessions.length === 0) return;

  const decrements = { americas: 0, europe: 0, asiaPacific: 0 };
  const stillActive = [];

  for (const entry of listRaw.sessions) {
    const sessionData = await env.SESSIONS.get(`session:${entry.id}`);
    if (sessionData) {
      stillActive.push(entry);
    } else {
      // KV TTL expired this session — count for decrement
      if (decrements[entry.region] !== undefined) {
        decrements[entry.region] += 1;
      }
      // Clean up the IP lock so user isn't locked out (zombie session fix)
      if (entry.ip) {
        await env.CACHE.delete(`active:${entry.ip}`);
      }
    }
  }

  const totalExpired = Object.values(decrements).reduce((a, b) => a + b, 0);
  if (totalExpired > 0) {
    const doId = env.THRON_COUNTER.idFromName('global');
    const stub = env.THRON_COUNTER.get(doId);
    await stub.fetch(new Request('https://do/batch-decrement', {
      method: 'POST',
      body: JSON.stringify({ decrements }),
    }));
  }

  await env.CACHE.put('active-sessions', JSON.stringify({ sessions: stillActive }));
}
