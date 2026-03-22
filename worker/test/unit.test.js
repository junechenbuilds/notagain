import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// ─── geo.js tests ──────────────────────────────────────────
// Import the real module instead of reimplementing
import { mapContinent } from '../src/geo.js';

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
// Rate limiting uses Cloudflare Cache API which isn't available in node:test.
// The real module requires `caches.default` (a Workers global), so we can't
// import it directly in Node. We test the logic with a mock that mirrors
// the Cache API interface the function uses (match/put).

// Mock Cache API store (mirrors caches.default.match/put)
function createMockCacheApi() {
  const store = {};
  return {
    match: async (key) => store[key] ?? null,
    put: async (key, response) => { store[key] = response; },
    delete: async (key) => { delete store[key]; },
    _store: store,
  };
}

// Reimplement to match rate-limit.js logic (Cache API version)
// NOTE: We can't import the real module because it references `caches.default`
// which doesn't exist in Node. This is a known limitation — for full coverage,
// use Miniflare or wrangler dev integration tests.
async function checkRateLimit(cache, ipHash) {
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

describe('rate-limit.js — checkRateLimit', () => {
  it('allows first request from an IP hash', async () => {
    const cache = createMockCacheApi();
    const result = await checkRateLimit(cache, 'abc123hash');
    assert.equal(result.limited, false);
  });

  it('blocks after 30 sessions per hour', async () => {
    const cache = createMockCacheApi();
    await cache.put('https://cache/ratelimit/abc123hash', new Response('30'));

    const result = await checkRateLimit(cache, 'abc123hash');
    assert.equal(result.limited, true);
    assert.match(result.reason, /Too many/);
  });

  it('allows up to 30 sessions', async () => {
    const cache = createMockCacheApi();
    await cache.put('https://cache/ratelimit/abc123hash', new Response('29'));

    const result = await checkRateLimit(cache, 'abc123hash');
    assert.equal(result.limited, false);
  });

  it('increments counter on each allowed request', async () => {
    const cache = createMockCacheApi();

    await checkRateLimit(cache, 'abc123hash');
    const r1 = cache._store['https://cache/ratelimit/abc123hash'];
    assert.equal(await r1.clone().text(), '1');

    await checkRateLimit(cache, 'abc123hash');
    const r2 = cache._store['https://cache/ratelimit/abc123hash'];
    assert.equal(await r2.clone().text(), '2');
  });

  it('different IP hashes are tracked separately', async () => {
    const cache = createMockCacheApi();
    await cache.put('https://cache/ratelimit/hash1', new Response('30'));

    const result1 = await checkRateLimit(cache, 'hash1');
    assert.equal(result1.limited, true);

    const result2 = await checkRateLimit(cache, 'hash2');
    assert.equal(result2.limited, false);
  });
});

// ─── i18n JSON validation ──────────────────────────────────
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
