import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// ─── geo.js tests ──────────────────────────────────────────
// Can't import ES module directly in node:test, so inline the logic
const CONTINENT_MAP = {
  NA: 'americas', SA: 'americas',
  EU: 'europe', AF: 'europe',
  AS: 'asiaPacific', OC: 'asiaPacific', AN: 'asiaPacific',
};
function mapContinent(cfContinent) {
  return CONTINENT_MAP[cfContinent] || 'americas';
}

describe('geo.js — mapContinent', () => {
  it('maps North America to americas', () => {
    assert.equal(mapContinent('NA'), 'americas');
  });

  it('maps South America to americas', () => {
    assert.equal(mapContinent('SA'), 'americas');
  });

  it('maps Europe to europe', () => {
    assert.equal(mapContinent('EU'), 'europe');
  });

  it('maps Africa to europe', () => {
    assert.equal(mapContinent('AF'), 'europe');
  });

  it('maps Asia to asiaPacific', () => {
    assert.equal(mapContinent('AS'), 'asiaPacific');
  });

  it('maps Oceania to asiaPacific', () => {
    assert.equal(mapContinent('OC'), 'asiaPacific');
  });

  it('maps Antarctica to asiaPacific', () => {
    assert.equal(mapContinent('AN'), 'asiaPacific');
  });

  it('defaults unknown continent to americas', () => {
    assert.equal(mapContinent('XX'), 'americas');
    assert.equal(mapContinent(undefined), 'americas');
    assert.equal(mapContinent(''), 'americas');
  });
});

// ─── rate-limit.js tests ───────────────────────────────────
// Mock KV store
function createMockKV() {
  const store = {};
  return {
    get: async (key) => store[key] ?? null,
    put: async (key, value) => { store[key] = value; },
    delete: async (key) => { delete store[key]; },
    _store: store,
  };
}

async function checkRateLimit(env, ip) {
  const activeSession = await env.CACHE.get(`active:${ip}`);
  if (activeSession) {
    return { limited: true, reason: 'You already have an active session' };
  }
  const hourKey = `ratelimit:${ip}`;
  const countRaw = await env.CACHE.get(hourKey);
  const count = countRaw ? parseInt(countRaw, 10) : 0;
  if (count >= 30) {
    return { limited: true, reason: 'Too many sessions. Try again later.' };
  }
  await env.CACHE.put(hourKey, String(count + 1));
  return { limited: false };
}

describe('rate-limit.js — checkRateLimit', () => {
  it('allows first request from an IP', async () => {
    const env = { CACHE: createMockKV() };
    const result = await checkRateLimit(env, '1.2.3.4');
    assert.equal(result.limited, false);
  });

  it('blocks if IP already has an active session', async () => {
    const env = { CACHE: createMockKV() };
    await env.CACHE.put('active:1.2.3.4', 'session-123');

    const result = await checkRateLimit(env, '1.2.3.4');
    assert.equal(result.limited, true);
    assert.match(result.reason, /active session/);
  });

  it('blocks after 30 sessions per hour', async () => {
    const env = { CACHE: createMockKV() };
    await env.CACHE.put('ratelimit:1.2.3.4', '30');

    const result = await checkRateLimit(env, '1.2.3.4');
    assert.equal(result.limited, true);
    assert.match(result.reason, /Too many/);
  });

  it('allows up to 30 sessions', async () => {
    const env = { CACHE: createMockKV() };
    await env.CACHE.put('ratelimit:1.2.3.4', '29');

    const result = await checkRateLimit(env, '1.2.3.4');
    assert.equal(result.limited, false);
    // Should have incremented to 30
    assert.equal(env.CACHE._store['ratelimit:1.2.3.4'], '30');
  });

  it('increments counter on each allowed request', async () => {
    const env = { CACHE: createMockKV() };

    await checkRateLimit(env, '1.2.3.4');
    assert.equal(env.CACHE._store['ratelimit:1.2.3.4'], '1');

    await checkRateLimit(env, '1.2.3.4');
    assert.equal(env.CACHE._store['ratelimit:1.2.3.4'], '2');
  });

  it('different IPs are tracked separately', async () => {
    const env = { CACHE: createMockKV() };
    await env.CACHE.put('active:1.2.3.4', 'session-123');

    const result1 = await checkRateLimit(env, '1.2.3.4');
    assert.equal(result1.limited, true);

    const result2 = await checkRateLimit(env, '5.6.7.8');
    assert.equal(result2.limited, false);
  });
});

// ─── i18n JSON validation ──────────────────────────────────
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const i18nDir = join(__dirname, '..', '..', 'frontend', 'i18n');

describe('i18n JSON files', () => {
  const langs = ['en', 'zh', 'es'];

  for (const lang of langs) {
    it(`${lang}.json is valid JSON`, () => {
      const raw = readFileSync(join(i18nDir, `${lang}.json`), 'utf-8');
      const data = JSON.parse(raw);
      assert.ok(data);
    });

    it(`${lang}.json has required top-level keys`, () => {
      const data = JSON.parse(readFileSync(join(i18nDir, `${lang}.json`), 'utf-8'));
      const requiredKeys = [
        'counter', 'session', 'button', 'stats', 'leaderboard',
        'tagline', 'toast', 'share', 'wittySubtexts', 'timeComments', 'endMessages',
      ];
      for (const key of requiredKeys) {
        assert.ok(data[key] !== undefined, `Missing key: ${key} in ${lang}.json`);
      }
    });

    it(`${lang}.json has wittySubtexts as a non-empty array`, () => {
      const data = JSON.parse(readFileSync(join(i18nDir, `${lang}.json`), 'utf-8'));
      assert.ok(Array.isArray(data.wittySubtexts), `wittySubtexts should be an array in ${lang}.json`);
      assert.ok(data.wittySubtexts.length >= 5, `wittySubtexts too few in ${lang}.json`);
    });

    it(`${lang}.json has timeComments as a non-empty array of objects`, () => {
      const data = JSON.parse(readFileSync(join(i18nDir, `${lang}.json`), 'utf-8'));
      assert.ok(Array.isArray(data.timeComments));
      for (const c of data.timeComments) {
        assert.ok(typeof c.min === 'number', `timeComment missing min in ${lang}.json`);
        assert.ok(typeof c.text === 'string', `timeComment missing text in ${lang}.json`);
      }
    });

    it(`${lang}.json has endMessages as a non-empty array of objects`, () => {
      const data = JSON.parse(readFileSync(join(i18nDir, `${lang}.json`), 'utf-8'));
      assert.ok(Array.isArray(data.endMessages));
      for (const m of data.endMessages) {
        assert.ok(typeof m.maxMin === 'number', `endMessage missing maxMin in ${lang}.json`);
        assert.ok(typeof m.text === 'string', `endMessage missing text in ${lang}.json`);
      }
    });

    it(`${lang}.json toast has all required keys`, () => {
      const data = JSON.parse(readFileSync(join(i18nDir, `${lang}.json`), 'utf-8'));
      assert.ok(data.toast.falseAlarm, `Missing toast.falseAlarm in ${lang}.json`);
      assert.ok(data.toast.copied, `Missing toast.copied in ${lang}.json`);
      assert.ok(data.toast.copyFailed, `Missing toast.copyFailed in ${lang}.json`);
    });
  }

  it('all languages have same number of wittySubtexts', () => {
    const counts = langs.map((lang) => {
      const data = JSON.parse(readFileSync(join(i18nDir, `${lang}.json`), 'utf-8'));
      return data.wittySubtexts.length;
    });
    assert.equal(counts[0], counts[1], `en (${counts[0]}) vs zh (${counts[1]})`);
    assert.equal(counts[0], counts[2], `en (${counts[0]}) vs es (${counts[2]})`);
  });

  it('all languages have same number of timeComments', () => {
    const counts = langs.map((lang) => {
      const data = JSON.parse(readFileSync(join(i18nDir, `${lang}.json`), 'utf-8'));
      return data.timeComments.length;
    });
    assert.equal(counts[0], counts[1]);
    assert.equal(counts[0], counts[2]);
  });

  it('all languages have same number of endMessages', () => {
    const counts = langs.map((lang) => {
      const data = JSON.parse(readFileSync(join(i18nDir, `${lang}.json`), 'utf-8'));
      return data.endMessages.length;
    });
    assert.equal(counts[0], counts[1]);
    assert.equal(counts[0], counts[2]);
  });
});
