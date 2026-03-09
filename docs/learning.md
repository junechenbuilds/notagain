# Learning Notes

Things we learned while building notagain.one. Keeping these for future reference.

---

## SSE vs Polling — When to Use Which

**Date:** March 7, 2026
**Context:** We initially chose SSE (Server-Sent Events) for the live counter, then switched to polling. Here's what we learned.

### What is SSE (Server-Sent Events)?

SSE is a way for a server to **push** data to the browser over a long-lived HTTP connection. The server keeps the connection open and sends updates whenever something changes. The browser receives them instantly.

```
Browser ───opens connection───▶ Server
Browser ◀──data: count is 1840──── Server
Browser ◀──data: count is 1841──── Server
Browser ◀──data: count is 1839──── Server
         (connection stays open)
```

**Good for:** Chat apps, stock tickers, live sports scores, notifications — anything where millisecond freshness matters.

### What is Polling?

Polling is simpler. The browser asks the server "what's the count?" on a timer (e.g., every 3 seconds). Each request is independent — no persistent connection.

```
Browser ──GET /stats──▶ Server ──▶ { count: 1840 }
   (wait 3 seconds)
Browser ──GET /stats──▶ Server ──▶ { count: 1841 }
   (wait 3 seconds)
Browser ──GET /stats──▶ Server ──▶ { count: 1839 }
```

**Good for:** Dashboards, leaderboards, counters, any data where being 2-3 seconds stale is totally fine.

### Side-by-Side Comparison

| | SSE | Polling (every 3s) |
|---|---|---|
| **How it works** | Server pushes updates over a persistent connection | Client requests updates on a timer |
| **Latency** | Near-instant (< 100ms) | Up to 3 seconds stale |
| **Implementation** | More complex (connection management, reconnection, error handling) | Dead simple (`setInterval` + `fetch()`) |
| **Server load** | Holds open connections (memory per connection) | Stateless requests (no memory between requests) |
| **Scaling** | Gets harder at scale (200K+ open connections) | Scales linearly and predictably |
| **Browser support** | All modern browsers (but quirks with some proxies/CDNs) | Works everywhere, no edge cases |
| **Hosting compatibility** | Some platforms have timeout limits (Vercel: 10-60s) | Works on every hosting platform |
| **Reconnection** | Built-in browser auto-reconnect, but needs handling | No reconnection needed — each request is independent |
| **Cost** | Lower request count, but persistent connections cost memory | Higher request count, but each request is cheap |
| **Debugging** | Harder (stream-based, connection state) | Easy (just HTTP requests, visible in network tab) |

### Why We Chose Polling for notagain.one

1. **Our counter is fun, not financial.** Nobody notices if the number is 3 seconds stale.
2. **Solo builder.** Polling has zero edge cases. SSE has reconnection logic, timeout handling, proxy compatibility issues.
3. **Scales more predictably.** 10K users = 3,333 requests/sec (easy). With SSE, that's 10K open connections to manage.
4. **Works everywhere.** Polling has zero platform restrictions. SSE has timeout limits on some hosting (Vercel caps at 10s on free tier).
5. **Can upgrade later.** If we ever need instant updates, switching from polling to SSE is a small change.

### When You SHOULD Use SSE Instead

- **Chat/messaging apps** — users expect messages instantly
- **Collaborative editing** — Google Docs-style real-time sync
- **Live auctions** — price changes need to be instant
- **Financial dashboards** — stock prices, crypto tickers
- **Gaming** — real-time player state (though WebSockets are usually better here)

### The Decision Rule

> **If being 3 seconds stale would make users unhappy → use SSE or WebSockets.**
> **If being 3 seconds stale is invisible → use polling. It's simpler.**

### What About WebSockets?

WebSockets are **two-way** (client ↔ server). Use them when the client also needs to send frequent data to the server in real-time (multiplayer games, live chat). For one-way updates (server → client), SSE is simpler than WebSockets. And for cases where even SSE is overkill, polling wins.

```
Complexity scale:
Polling (simplest) → SSE (middle) → WebSockets (most complex)
```

Pick the simplest option that meets your needs.

---

## Durable Objects & KV — Cloudflare's Storage Options

**Date:** March 8, 2026
**Context:** We chose Cloudflare's all-in-one stack for notagain. Two key storage concepts: Durable Objects (for the counter) and KV (for the leaderboard cache). Here's how they work and why we need both.

### What is a Durable Object?

A Durable Object is like **a tiny computer that lives on the internet and remembers things**. It's a single instance of code + state that processes requests one at a time, in order.

For notagain, we need one source of truth for "how many partners are on the throne right now." If 100 people tap "Mine too!" at the exact same time, we can't have them all writing to different places — the count would get confused. A Durable Object handles this by queuing requests:

```
Person A taps → count goes 500 → 501
Person B taps → count goes 501 → 502
Person C taps → count goes 502 → 503
(never 500 → 501, 500 → 501, 500 → 501)
```

This is called **strong consistency** — every read sees the latest write. It's like having one shared notebook that people take turns writing in, instead of everyone scribbling on separate copies.

**The trade-off:** A Durable Object lives in one physical location (Cloudflare picks the region closest to the first request). Users far from that location have slightly more latency. But for a fun counter, nobody notices an extra 50ms.

**Unique to Cloudflare.** No other platform has an exact equivalent. The closest alternatives are Upstash Redis (hosted Redis database) or Supabase (hosted Postgres), but those are separate services you'd need to manage alongside your hosting.

### What is KV (Key-Value Store)?

KV is much simpler — it's like a **giant dictionary spread across the world**. You store things by name (the "key") and get back the value.

```
Key: "leaderboard"       → Value: { americas: 685, europe: 343, asiaPacific: 811 }
Key: "session:abc123"    → Value: { region: "americas", startedAt: "2026-03-08T..." }
```

The data is copied to 300+ Cloudflare edge locations worldwide, so reading is extremely fast from anywhere. But when you write something new, it takes a few seconds to spread to all locations. This is called **eventual consistency** — "it'll get there eventually, just not instantly."

For our leaderboard, this is perfectly fine. Nobody cares if Asia-Pacific shows 811 for 3 extra seconds before updating to 814.

### Why We Use Both

They solve different problems:

| | Durable Object | KV |
|---|---|---|
| **What it's good at** | Writing accurately (counter) | Reading fast from anywhere (leaderboard) |
| **Where it lives** | One location | 300+ locations worldwide |
| **Write speed** | Instant (one location) | Slow to propagate (seconds) |
| **Read speed** | Fast from nearby, slower from far away | Fast from everywhere |
| **Consistency** | Strongly consistent (always correct) | Eventually consistent (correct within seconds) |
| **Our use** | The global counter (must be exact) | Leaderboard cache, session storage |

Think of it this way: the Durable Object is the **brain** (one accurate counter that processes everything in order). KV is the **billboard network** (copies of the leaderboard posted at every street corner worldwide — might be a few seconds out of date, but fast to read from anywhere).

### How They Work Together in notagain

```
User taps "Mine too!"
    │
    ▼
Cloudflare Worker receives request
    │
    ├──▶ Durable Object: increment counter (500 → 501) ← must be accurate
    │
    ├──▶ KV: store session data with 60-min TTL ← fast read from anywhere
    │
    └──▶ KV: update leaderboard cache ← eventually consistent, that's fine
```

Every 3 seconds, when clients poll `GET /stats`, the Worker can serve the leaderboard from KV (fast, nearby) and the counter from the Durable Object (accurate, maybe slightly further away).

### Why This Made Cloudflare the Right Choice

We originally chose Cloudflare because it supported SSE (Server-Sent Events). After switching to polling, we re-evaluated — and Cloudflare still wins, but for a different reason: **Durable Objects**.

Without Durable Objects, we'd need an external database for the counter:

| Approach | What you manage |
|----------|----------------|
| **Cloudflare (our choice)** | One platform: Pages + Workers + Durable Objects + KV. One bill, one dashboard. |
| **Vercel + Upstash Redis** | Two platforms: Vercel for hosting/functions, Upstash for the counter database. Two bills, two dashboards. |
| **Vercel + Supabase** | Two platforms: Vercel for hosting/functions, Supabase for the counter database. Even more overkill — Postgres for a single number. |

For a solo builder, "one platform for everything" is a real advantage. Less to manage, less to debug, less to pay for.

### The Decision Rule

> **Need a single source of truth that handles concurrent writes? → Durable Object (or Redis/Postgres if not on Cloudflare)**
> **Need fast reads from everywhere, okay with seconds of staleness? → KV (or any CDN-edge cache)**
> **Need both? → Use both. That's what they're designed for.**

---

*More learnings will be added as we build.*
