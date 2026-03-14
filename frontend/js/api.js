// Auto-detect: localhost dev uses worker on port 8787, production uses Cloudflare Worker
const API_BASE = location.hostname === 'localhost'
  ? 'http://localhost:8787'
  : 'https://notagain-api.junechenbuilds.workers.dev';

export async function fetchStats() {
  const res = await fetch(`${API_BASE}/api/stats`);
  if (!res.ok) throw new Error('Failed to fetch stats');
  return res.json();
}

export async function postTap() {
  const res = await fetch(`${API_BASE}/api/tap`, { method: 'POST' });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to start session');
  }
  return res.json();
}

export async function postEnd(sessionId) {
  const res = await fetch(`${API_BASE}/api/end`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId }),
  });
  if (!res.ok) throw new Error('Failed to end session');
  return res.json();
}
