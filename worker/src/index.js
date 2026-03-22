import { ThronCounter } from './counter.js';
import { hashIp, createSession, endSession, expireSessions } from './sessions.js';
import { mapContinent } from './geo.js';
import { checkRateLimit } from './rate-limit.js';

export { ThronCounter };

const LEADERBOARD_KEY = 'https://cache/leaderboard';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function corsHeaders(env, request) {
  const origin = request?.headers?.get('Origin') || '';
  const allowed = env.ALLOWED_ORIGIN || 'https://notagain.one';
  const isAllowed = origin === allowed || origin.startsWith('http://localhost');
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : allowed,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'",
};

function jsonResponse(data, env, status = 200, request = null) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...SECURITY_HEADERS,
      ...corsHeaders(env, request),
    },
  });
}

const SEED_COUNT = 50;

function getCounterStub(env) {
  const id = env.THRON_COUNTER.idFromName('global');
  return env.THRON_COUNTER.get(id);
}

// Seed splits: 17 + 15 + 18 = 50
const SEED_AMERICAS = 17;
const SEED_EUROPE = 15;
const SEED_ASIA_PACIFIC = 18;

function addSeed(counts) {
  return {
    globalCount: counts.globalCount + SEED_COUNT,
    regionCounts: {
      americas: counts.regionCounts.americas + SEED_AMERICAS,
      europe: counts.regionCounts.europe + SEED_EUROPE,
      asiaPacific: counts.regionCounts.asiaPacific + SEED_ASIA_PACIFIC,
    },
  };
}

async function handleTap(request, env) {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const ipHash = await hashIp(ip, env.IP_HASH_SECRET);

  // Cheap pre-filter: hourly rate limit via Cache API (not authoritative for active-session check)
  const rateCheck = await checkRateLimit(env, ipHash);
  if (rateCheck.limited) {
    return jsonResponse({ error: rateCheck.reason }, env, 429, request);
  }

  const continent = request.cf?.continent || 'NA';
  const region = mapContinent(continent);
  const sessionId = crypto.randomUUID();

  // Atomic admission: DO checks IP lock + increments + tracks session in one call
  const stub = getCounterStub(env);
  const doRes = await stub.fetch(new Request('https://do/admit', {
    method: 'POST',
    body: JSON.stringify({ region, sessionId, ipHash }),
  }));

  if (doRes.status === 429) {
    const err = await doRes.json();
    return jsonResponse({ error: err.error }, env, 429, request);
  }
  if (doRes.status === 400) {
    const err = await doRes.json();
    return jsonResponse({ error: err.error }, env, 400, request);
  }

  const counts = await doRes.json();

  // Store session in KV (best-effort backup) + invalidate leaderboard cache
  await createSession(env, sessionId, region, ipHash);
  await caches.default.delete(LEADERBOARD_KEY);

  const seeded = addSeed(counts);
  return jsonResponse({
    sessionId,
    globalCount: seeded.globalCount,
    region,
    regionCounts: seeded.regionCounts,
  }, env, 200, request);
}

async function handleEnd(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid request body' }, env, 400, request);
  }

  const { sessionId } = body;
  if (!sessionId || typeof sessionId !== 'string' || !UUID_RE.test(sessionId)) {
    return jsonResponse({ error: 'Invalid sessionId' }, env, 400, request);
  }

  // Clean up KV session + IP lock
  const result = await endSession(env, sessionId);

  // Always tell the DO to decrement (it's the authority)
  const stub = getCounterStub(env);
  const doRes = await stub.fetch(new Request('https://do/decrement', {
    method: 'POST',
    body: JSON.stringify({ sessionId }),
  }));
  const counts = await doRes.json();
  await caches.default.delete(LEADERBOARD_KEY);

  if (!result && !counts.found) {
    return jsonResponse({ error: 'Session not found or already ended' }, env, 404, request);
  }

  const seeded = addSeed(counts);
  return jsonResponse({
    globalCount: seeded.globalCount,
    duration: result?.duration || 0,
    regionCounts: seeded.regionCounts,
  }, env, 200, request);
}

async function handleStats(request, env) {
  const cache = caches.default;
  const continent = request.cf?.continent || 'NA';
  const userRegion = mapContinent(continent);

  // Try Cache API first (auto-expires via Cache-Control)
  const cachedRes = await cache.match(LEADERBOARD_KEY);
  if (cachedRes) {
    const cached = await cachedRes.json();
    const seeded = addSeed(cached);
    return jsonResponse({
      globalCount: seeded.globalCount,
      regionCounts: seeded.regionCounts,
      userRegion,
    }, env);
  }

  // Fetch fresh from DO
  const stub = getCounterStub(env);
  const doRes = await stub.fetch(new Request('https://do/counts', { method: 'GET' }));
  const counts = await doRes.json();

  // Cache for 5 seconds via Cache API (free, unlimited)
  await cache.put(LEADERBOARD_KEY, new Response(JSON.stringify(counts), {
    headers: { 'Cache-Control': 'max-age=5', 'Content-Type': 'application/json' },
  }));

  const seeded = addSeed(counts);
  return jsonResponse({
    globalCount: seeded.globalCount,
    regionCounts: seeded.regionCounts,
    userRegion,
  }, env, 200, request);
}

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: { ...SECURITY_HEADERS, ...corsHeaders(env, request) },
      });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      if (path === '/api/tap' && request.method === 'POST') {
        return await handleTap(request, env);
      }
      if (path === '/api/end' && request.method === 'POST') {
        return await handleEnd(request, env);
      }
      if (path === '/api/stats' && request.method === 'GET') {
        return await handleStats(request, env);
      }
      return jsonResponse({ error: 'Not found' }, env, 404, request);
    } catch (err) {
      console.error('Worker error:', err);
      return jsonResponse({ error: 'Internal error' }, env, 500, request);
    }
  },

  async scheduled(event, env, ctx) {
    await expireSessions(env);
  },
};
