# Architecture: notagain.one

**Phase:** 2c — Architecture Decision Record
**Date:** March 7, 2026
**Author:** June + Claude

---

## 1. Requirements Summary

### Functional
- Real-time global counter showing active "on the throne" sessions
- "Mine too!" button starts a session, "They're back!" ends it
- Sessions auto-expire after 60 minutes
- Regional leaderboard (3 regions: Americas, Europe, Asia-Pacific) with region detected via IP
- Share button: copy text snippet to clipboard / native share sheet
- OG meta tags for rich link previews
- Personal stats stored in browser LocalStorage (visits, durations, streaks)
- 3 languages: English, Chinese (Simplified), Spanish — auto-detected
- Sound effect toggle (opt-in toilet flush)

### Non-Functional
- Page load: < 2 seconds on 3G
- Counter update freshness: ≤ 3 seconds (polling interval)
- Handle 10,000+ concurrent sessions at peak
- Survive viral traffic spikes (design for 10x expected load)
- Monthly cost: < $50/month at baseline, scales predictably
- Solo developer — minimize operational complexity

### Constraints
- Solo builder (June) — must be simple to build, deploy, and maintain
- No user accounts, no server-side personal data
- No native app — website only
- Domain: notagain.one

---

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT                               │
│  Static site (HTML/CSS/JS) served from CDN edge             │
│  ┌──────────┐  ┌──────────┐  ┌────────────┐               │
│  │ Counter   │  │ Timer    │  │ LocalStorage│               │
│  │ Display   │  │ UI       │  │ (stats,    │               │
│  │           │  │          │  │  prefs)    │               │
│  └─────┬────┘  └────┬─────┘  └────────────┘               │
│        │             │                                      │
│        │ Poll (3s)   │ REST                                 │
│        ▼             ▼                                      │
└────────┬─────────────┬──────────────────────────────────────┘
         │             │
         │  HTTPS      │  HTTPS
         ▼             ▼
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND (Single service)                  │
│                                                             │
│  ┌──────────────────────────┐  ┌──────────┐                │
│  │ REST API                 │  │ Session   │                │
│  │ /tap, /end, /stats       │  │ Expiry    │                │
│  │                          │  │ Worker    │                │
│  │                          │  │ (cron)    │                │
│  └────────────┬─────────────┘  └────┬─────┘                │
│       │              │             │                        │
│       └──────────────┴─────────────┘                        │
│                      │                                      │
│                      ▼                                      │
│              ┌───────────────┐                              │
│              │ Durable Obj   │                              │
│              │  (counter)    │                              │
│              │ + KV (cache,  │                              │
│              │   sessions)   │                              │
│              └───────────────┘                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Tech Stack Decision

| Layer | Choice | Why |
|-------|--------|-----|
| **Frontend** | Static HTML/CSS/JS (vanilla or Astro) | Dead simple, fast, no framework bloat. Single page, no routing needed. |
| **Hosting (static)** | Cloudflare Pages | Free tier, global CDN, fast edge delivery, custom domain support. |
| **Backend** | Cloudflare Workers | Serverless, globally distributed, scales to zero, handles spikes automatically. No server to manage. |
| **Real-time** | Polling (every 3 seconds) | Simpler than SSE or WebSockets. Stateless requests scale predictably. No connection management. Dead simple to implement — just a `setInterval` + `fetch()`. |
| **Data store** | Cloudflare KV + Durable Objects | KV for regional counts (eventually consistent, fine for leaderboard). Durable Objects for the global counter (strongly consistent, handles concurrent increments). |
| **Geo detection** | Cloudflare `cf.country` / `cf.continent` header | Free, automatic, no third-party API needed. Cloudflare adds geo data to every request. |
| **Domain / DNS** | Cloudflare DNS | Already using Cloudflare for everything — keep DNS there too. |
| **i18n** | JSON translation files bundled in static assets | 3 languages, ~200 strings each. No need for a translation service. Ship as part of the build. |
| **Analytics** | Cloudflare Web Analytics | Free, privacy-friendly, no cookies. Gives pageviews, visitors, referrers. |

### Why Cloudflare over alternatives?

The main reason is **Durable Objects** — Cloudflare's unique strongly-consistent storage that handles concurrent counter writes without needing an external database. Every other option requires managing a separate database service for the counter.

| Alternative | Why not |
|-------------|---------|
| Vercel + Upstash Redis | Two platforms to manage (Vercel for hosting/functions + Upstash for counter). Two bills, two dashboards. Vercel $20/mo pro + Upstash ~$10/mo vs Cloudflare $5/mo. |
| Vercel + Supabase | Even more overkill — Postgres for a single counter number. Two platforms, more complexity. |
| AWS (Lambda + DynamoDB + CloudFront) | Over-engineered for this. More config, more cost at scale, more operational burden. |
| Firebase | Good real-time support, but vendor lock-in, and the pricing model gets unpredictable at scale. |
| Fly.io + Redis | Good option, but requires managing a Redis instance. Cloudflare Durable Objects solve the same problem with zero ops. |

**Cloudflare wins because:** Durable Objects give us a strongly consistent counter without an external database. Everything lives in one platform (CDN, compute, storage, DNS, analytics, geo detection) — one bill, one dashboard, one CLI. It scales to zero cost at low traffic and handles viral spikes automatically. Perfect for a solo builder.

---

## 4. Data Model

### 4.1 Server-Side (Cloudflare Durable Objects + KV)

**Global Counter (Durable Object: `ThronCounter`)**

A single Durable Object instance that holds the authoritative global count. All increments/decrements go through it to avoid race conditions.

```
State:
  globalCount: number          // current active sessions worldwide
  regionCounts: {              // breakdown by region
    americas: number
    europe: number
    asiaPacific: number
  }
```

**Active Sessions (Durable Object or KV with TTL)**

```
Key: session:{sessionId}
Value: {
  region: "americas" | "europe" | "asiaPacific"
  startedAt: ISO timestamp
  expiresAt: ISO timestamp (startedAt + 60 min)
}
TTL: 60 minutes (auto-cleanup)
```

Session IDs are generated client-side (random UUID stored in sessionStorage — not localStorage, so each tab is independent).

**Leaderboard (KV — eventually consistent is fine)**

```
Key: leaderboard:current
Value: {
  americas: number
  europe: number
  asiaPacific: number
  lastUpdated: ISO timestamp
}
```

Updated every 5 seconds from the Durable Object state. Clients poll this for the leaderboard. Eventual consistency is fine — it's a fun leaderboard, not a bank.

### 4.2 Client-Side (LocalStorage)

```javascript
// Key: "notagain_stats"
{
  visitCount: 23,
  totalDuration: 28800,        // seconds across all sessions
  longestSession: 2520,        // seconds
  sessions: [                  // last 50 sessions (for streak calc)
    { date: "2026-03-07", duration: 1380 },
    { date: "2026-03-06", duration: 960 },
    ...
  ],
  currentStreak: 3,            // consecutive days
  lang: "en",                  // language preference
  soundOn: false,              // sound preference
  achievements: ["first-flush", "hat-trick", "night-owl"],
  firstVisit: "2026-02-15"
}
```

All personal data lives here. If the user clears their browser, stats reset — that's the trade-off for no accounts.

---

## 5. API Design

### 5.1 REST Endpoints

All endpoints live on `api.notagain.one` (Cloudflare Worker).

**POST /tap**
Start a session ("Mine too!").

```
Request:
  (no body — region detected from Cloudflare cf headers)

Response: 200
{
  sessionId: "uuid-here",
  globalCount: 1840,
  region: "americas",
  regionCounts: { americas: 686, europe: 343, asiaPacific: 811 }
}
```

**POST /end**
End a session ("They're back!").

```
Request:
{
  sessionId: "uuid-here"
}

Response: 200
{
  globalCount: 1839,
  duration: 1380,
  regionCounts: { americas: 685, europe: 343, asiaPacific: 811 }
}
```

**GET /stats**
Get current counts (for initial page load).

```
Response: 200
{
  globalCount: 1839,
  regionCounts: { americas: 685, europe: 343, asiaPacific: 811 },
  userRegion: "americas"
}
```

### 5.2 Polling Strategy

The client polls `GET /stats` every 3 seconds using `setInterval` + `fetch()`. No persistent connections needed.

```javascript
// Client-side polling (simplified)
setInterval(async () => {
  const res = await fetch('https://api.notagain.one/stats');
  const data = await res.json();
  updateCounterDisplay(data.globalCount, data.regionCounts);
}, 3000);
```

**Why 3 seconds?** Fast enough to feel "live" for a fun counter. Slow enough to keep request volume manageable. At 10K concurrent users, that's ~3,333 requests/sec — well within Cloudflare Workers' capacity.

---

## 6. Key Flows

### Flow 1: Page Load
1. Browser requests `notagain.one` → Cloudflare Pages serves static HTML/CSS/JS from nearest edge
2. JS calls `GET /stats` → Worker reads from Durable Object, detects region from `cf.continent`
3. JS starts polling `GET /stats` every 3 seconds for live count updates
4. JS reads LocalStorage for personal stats, language preference
5. Page renders with live counter, personal stats, leaderboard

### Flow 2: "Mine too!" Tap
1. JS calls `POST /tap` → Worker increments Durable Object counter for global + region
2. Worker creates session with 60-min TTL
3. Response includes new counts + sessionId
4. JS stores sessionId in sessionStorage (tab-scoped)
5. JS starts local timer display
6. Other clients pick up the new count on their next 3-second poll

### Flow 3: "They're back!" Tap
1. JS calls `POST /end` with sessionId → Worker decrements counters, deletes session
2. Response includes final duration + updated counts
3. JS updates LocalStorage: increment visitCount, add session to history, recalculate averages/streaks/achievements
4. UI shows end-of-session summary

### Flow 4: Session Auto-Expiry
1. Cloudflare Worker runs a scheduled task (cron trigger) every 5 minutes
2. Checks for sessions past their 60-min TTL
3. Decrements counters for expired sessions
4. Cleans up expired session keys

---

## 7. Scaling Strategy

### Load Estimation

| Scenario | Concurrent users | Poll requests/sec | REST actions/sec |
|----------|-----------------:|------------------:|-----------------:|
| Quiet day | 500 | ~167 | ~5 |
| Normal day | 2,000 | ~667 | ~20 |
| Viral spike | 50,000 | ~16,667 | ~500 |
| Mega viral | 500,000 | ~166,667 | ~5,000 |

### Why This Scales

- **Cloudflare Pages:** Static files served from 300+ edge locations. Effectively infinite scale for static assets. Free.
- **Cloudflare Workers:** Serverless. No cold starts (V8 isolates, not containers). Auto-scales to millions of requests. Pay per request ($0.50/million after free tier).
- **Durable Objects:** Single-threaded per object, but handles thousands of requests/sec. The global counter is one object — bottleneck only at extreme scale (>10K writes/sec). If needed, can shard by region (3 objects instead of 1).
- **Polling:** Stateless requests scale linearly. No open connections to manage. At mega-viral scale (166K req/sec), can increase poll interval to 5-10 seconds, or serve cached responses from KV at the edge.

### Cost Estimation

| Scenario | Monthly cost |
|----------|-------------:|
| Quiet (10K visitors/month) | ~$0 (free tier) |
| Growing (100K visitors/month) | ~$5-10 |
| Viral (1M visitors/month) | ~$25-50 |
| Mega viral (10M visitors/month) | ~$200-500 |

Cloudflare's pricing is predictable and linear. No surprise bills.

---

## 8. Reliability & Error Handling

### What could go wrong?

| Failure | Impact | Mitigation |
|---------|--------|------------|
| Durable Object unavailable | Counter stops updating | Fall back to cached KV value. Show "approximately X" instead of live count. |
| Poll request fails | Client shows stale count for 3 seconds | Next poll will succeed. No reconnection logic needed. Stateless = resilient. |
| User closes tab without tapping "They're back!" | Orphaned session inflates count | 60-min auto-expiry via cron worker. |
| Bot spam (fake taps) | Inflated counter | Rate limiting per IP (Cloudflare WAF rules, free tier). Max 1 active session per IP. |
| KV outage | Leaderboard stale | Leaderboard is cached and eventually consistent anyway. Stale data is fine for minutes. |

### Rate Limiting
- Max 1 active session per IP address
- Max 10 taps per IP per hour (prevents rapid tap/end cycling)
- Cloudflare WAF handles this at the edge — no backend code needed

---

## 9. Security & Privacy

- **No personal data on server.** Sessions are anonymous UUIDs with a region tag. No IP addresses stored.
- **No cookies.** No tracking cookies. Cloudflare Web Analytics is cookieless.
- **HTTPS only.** Cloudflare provides free SSL.
- **IP used only for geo detection.** Cloudflare's `cf.continent` header. The IP itself is never stored or logged.
- **CORS:** API restricted to `notagain.one` origin only.
- **CSP headers:** Strict Content Security Policy to prevent XSS.
- **No third-party scripts.** No Google Analytics, no Facebook pixel, no ad trackers.

---

## 10. Development & Deployment

### Local Development
- Frontend: simple `index.html` with live-server or Vite for hot reload
- Backend: `wrangler dev` for Cloudflare Worker local development
- Durable Objects: wrangler supports local DO simulation

### Deployment
- Frontend: `git push` to main → Cloudflare Pages auto-deploys
- Backend: `wrangler deploy` → Cloudflare Worker deploys globally in <30 seconds
- Zero-downtime deploys (Cloudflare handles rolling updates)

### Monitoring
- Cloudflare dashboard: request count, error rates, latency (built-in, free)
- Cloudflare Web Analytics: visitor count, referrers, geography
- Durable Object metrics: active sessions, counter value (logged to Workers Analytics)
- Set up alerts: if error rate > 1% or latency > 1s

---

## 11. Trade-offs & Decisions

| Decision | Trade-off | Why we chose this |
|----------|-----------|-------------------|
| Polling over SSE/WebSockets | Counter may be up to 3 seconds stale. Slightly more requests than SSE. | Dead simple to implement. No connection management. Scales predictably. For a fun counter, 3-second staleness is invisible. Can always upgrade to SSE later if needed. |
| Durable Objects over Redis | Vendor lock-in to Cloudflare. Can't easily migrate. | Zero ops, auto-scales, strongly consistent. For a solo builder, ops simplicity beats portability. |
| No database (no Postgres, no Supabase) | Can't do complex queries or analytics on session data. | We don't need to. Active sessions are ephemeral. Personal stats are client-side. Leaderboard is 3 numbers. |
| LocalStorage over accounts | Users lose stats if they clear browser or switch devices. | This is the core product decision. Fun > friction. No sign-up wall, ever. |
| Single Durable Object for global counter | Bottleneck at extreme scale (>10K writes/sec). | Start simple. If we hit 10K writes/sec, we've gone mega-viral and can shard by region (3 objects). Good problem to have. |
| Cloudflare-only stack | Vendor lock-in. | Entire stack in one platform = one bill, one dashboard, one CLI. For a solo builder, this is a feature, not a bug. Migration path exists (Workers are standard JS, KV maps to Redis). |
| Polling leaderboard (eventual consistency) | Leaderboard may be 5 seconds stale. | Nobody cares if Asia-Pacific is 811 or 814. Freshness doesn't matter for fun leaderboards. |

---

## 12. What to Revisit as We Grow

- **If polling requests become too expensive:** Increase poll interval from 3s to 5-10s, or serve cached responses from Cloudflare KV at the edge (near-zero latency, cheaper than hitting the Durable Object every time).
- **If counter writes exceed 10K/sec:** Shard the Durable Object by region (3 objects). Each region counts independently, global total is summed.
- **If we add V2 fun facts:** Content can be stored in KV as JSON. Fetched on session start. Updated via a simple CMS (even a Google Sheet → KV pipeline).
- **If we want city-level leaderboard later:** Need a more granular geo lookup. Cloudflare's `cf.city` header exists but may be less reliable. Could use a lightweight MaxMind GeoLite2 lookup in the Worker.
- **If we add monetization:** Sponsorship can be a simple KV entry (sponsor name + message). No ad network integration needed for "brought to you by" sponsorship.

---

*This architecture is intentionally simple. The product is simple. The tech should match.*
