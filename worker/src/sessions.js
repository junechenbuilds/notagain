const cache = caches.default;
const LEADERBOARD_KEY = 'https://cache/leaderboard';

export async function createSession(env, sessionId, region, ip) {
  const session = {
    region,
    startedAt: new Date().toISOString(),
    ip,
  };

  // Store session with 60-min TTL (backup for KV-based lookups)
  await env.SESSIONS.put(`session:${sessionId}`, JSON.stringify(session), {
    expirationTtl: 3600,
  });

  // Track active session by IP (short TTL — cleared on end, auto-expires if browser closes)
  await cache.put(`https://cache/active/${ip}`, new Response(sessionId, {
    headers: { 'Cache-Control': 'max-age=300' },
  }));
}

export async function endSession(env, sessionId) {
  const raw = await env.SESSIONS.get(`session:${sessionId}`);
  if (!raw) return null;

  const session = JSON.parse(raw);
  const duration = Math.floor(
    (Date.now() - new Date(session.startedAt).getTime()) / 1000
  );

  // Clean up session + IP lock
  await env.SESSIONS.delete(`session:${sessionId}`);
  if (session.ip) {
    await cache.delete(`https://cache/active/${session.ip}`);
  }

  return { region: session.region, duration };
}

export async function expireSessions(env) {
  // The Durable Object handles session cleanup internally
  const doId = env.THRON_COUNTER.idFromName('global');
  const stub = env.THRON_COUNTER.get(doId);
  await stub.fetch(new Request('https://do/cleanup', { method: 'POST' }));

  // Also invalidate leaderboard cache so next poll gets fresh counts
  await cache.delete(LEADERBOARD_KEY);
}
