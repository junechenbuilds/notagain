import { ThronCounter } from './counter.js';
import { createSession, endSession, expireSessions } from './sessions.js';
import { mapContinent } from './geo.js';
import { checkRateLimit } from './rate-limit.js';

export { ThronCounter };

function corsHeaders(env, request) {
  const origin = request?.headers?.get('Origin') || '';
  const allowed = env.ALLOWED_ORIGIN || 'https://notagain.one';
  // Allow the configured origin, *.pages.dev (Cloudflare Pages), and localhost for dev
  const isAllowed =
    origin === allowed ||
    origin.endsWith('.pages.dev') ||
    origin.startsWith('http://localhost');
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : allowed,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function jsonResponse(data, env, status = 200, request = null) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(env, request) },
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

  const rateCheck = await checkRateLimit(env, ip);
  if (rateCheck.limited) {
    return jsonResponse({ error: rateCheck.reason }, env, 429, request);
  }

  const continent = request.cf?.continent || 'NA';
  const region = mapContinent(continent);
  const sessionId = crypto.randomUUID();

  // Increment counter (DO also tracks the session internally)
  const stub = getCounterStub(env);
  const doRes = await stub.fetch(new Request('https://do/increment', {
    method: 'POST',
    body: JSON.stringify({ region, sessionId }),
  }));
  const counts = await doRes.json();

  // Store session + invalidate leaderboard cache so next poll gets fresh data
  await createSession(env, sessionId, region, ip);
  await env.CACHE.delete('leaderboard');

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
  if (!sessionId) {
    return jsonResponse({ error: 'sessionId required' }, env, 400, request);
  }

  // Clean up KV session + IP lock
  const result = await endSession(env, sessionId);

  // Decrement counter in DO (DO has its own session map — always try)
  const stub = getCounterStub(env);
  const doRes = await stub.fetch(new Request('https://do/decrement', {
    method: 'POST',
    body: JSON.stringify({ sessionId }),
  }));
  const counts = await doRes.json();
  await env.CACHE.delete('leaderboard');

  const seeded = addSeed(counts);
  return jsonResponse({
    globalCount: seeded.globalCount,
    duration: result?.duration || 0,
    regionCounts: seeded.regionCounts,
  }, env, 200, request);
}

async function handleStats(request, env) {
  // Try KV cache first
  const cached = await env.CACHE.get('leaderboard', 'json');
  const continent = request.cf?.continent || 'NA';
  const userRegion = mapContinent(continent);

  if (cached && cached.timestamp && Date.now() - cached.timestamp < 5000) {
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

  // Cache for 5 seconds
  await env.CACHE.put('leaderboard', JSON.stringify({
    ...counts,
    timestamp: Date.now(),
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
      return new Response(null, { status: 204, headers: corsHeaders(env, request) });
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
