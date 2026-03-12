export async function checkRateLimit(env, ip) {
  // 1 active session per IP
  const activeSession = await env.CACHE.get(`active:${ip}`);
  if (activeSession) {
    return { limited: true, reason: 'You already have an active session' };
  }

  // Max 10 taps per hour per IP
  const hourKey = `ratelimit:${ip}`;
  const countRaw = await env.CACHE.get(hourKey);
  const count = countRaw ? parseInt(countRaw, 10) : 0;

  if (count >= 30) {
    return { limited: true, reason: 'Too many sessions. Try again later.' };
  }

  await env.CACHE.put(hourKey, String(count + 1), { expirationTtl: 3600 });

  return { limited: false };
}
