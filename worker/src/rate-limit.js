// Cheap pre-filter using Cache API. The Durable Object is the true authority
// for active-session admission (see counter.js /admit endpoint).
// This only enforces the hourly rate cap.

const cache = caches.default;

export async function checkRateLimit(env, ipHash) {
  // Max 30 taps per hour per IP
  const hourKey = `https://cache/ratelimit/${ipHash}`;
  const hourRes = await cache.match(hourKey);
  const count = hourRes ? parseInt(await hourRes.text(), 10) : 0;

  if (count >= 30) {
    return { limited: true, reason: 'Too many sessions. Try again later.' };
  }

  await cache.put(hourKey, new Response(String(count + 1), {
    headers: { 'Cache-Control': 'max-age=3600' },
  }));

  return { limited: false };
}
