const cache = caches.default;

export async function checkRateLimit(env, ip) {
  // 1 active session per IP
  const activeKey = `https://cache/active/${ip}`;
  const activeRes = await cache.match(activeKey);
  if (activeRes) {
    return { limited: true, reason: 'You already have an active session' };
  }

  // Max 30 taps per hour per IP
  const hourKey = `https://cache/ratelimit/${ip}`;
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
