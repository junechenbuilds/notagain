# Cost Analysis: notagain.one

**Phase:** 2f — Cost Estimation
**Date:** March 8, 2026
**Author:** June + Claude

---

## 1. What We're Paying For

notagain runs entirely on Cloudflare. Here's what each service does and how it's priced:

| Service | What it does for us | How it's priced |
|---------|-------------------|-----------------|
| **Cloudflare Pages** | Hosts the static site (HTML/CSS/JS) | Free (unlimited requests, unlimited bandwidth) |
| **Cloudflare Workers** | Runs the API (POST /tap, POST /end, GET /stats) | Free tier: 100K requests/day. Paid: $5/mo base, 10M requests included, then $0.30/million |
| **Durable Objects** | Stores the global counter (strongly consistent) | Free tier: 100K requests/day. Paid: 1M requests included, then $0.15/million + duration charges |
| **Workers KV** | Caches leaderboard, stores sessions | Free tier: 100K reads/day, 1K writes/day. Paid: 10M reads + 1M writes included, then $0.50/million reads, $5/million writes |
| **Cloudflare DNS** | Points notagain.one to Cloudflare | Free |
| **Cloudflare Web Analytics** | Cookieless visitor analytics | Free |
| **Domain (notagain.one)** | The domain name | ~$10-15/year |

**Key insight:** The only thing that costs money is the $5/mo Workers paid plan (once we outgrow the free tier) and the domain. Everything else — hosting, DNS, analytics, SSL — is free.

---

## 2. Traffic Scenarios

Let's estimate costs at different traffic levels. We'll use realistic assumptions based on the polling architecture (every user polls GET /stats every 3 seconds).

### Assumptions

- **Average visit duration:** 5 minutes (300 seconds)
- **Poll interval:** 3 seconds → ~100 polls per visit
- **Actions per visit:** 1 POST /tap + 1 POST /end = 2 action requests
- **Total requests per visit:** ~102 (100 polls + 2 actions)
- **Durable Object requests per visit:** 2 (tap + end hit the DO directly; polls can be served from KV cache)
- **KV reads per visit:** ~100 (polls read from KV cache)
- **KV writes per visit:** ~2 (session create + leaderboard update)

### Scenario Breakdown

#### Scenario 1: Just Launched (1K visitors/month)

| Resource | Usage | Cost |
|----------|-------|------|
| Workers requests | 102K/month | Free tier (100K/day limit = 3M/month) |
| Durable Object requests | 2K/month | Free tier |
| KV reads | 100K/month | Free tier |
| KV writes | 2K/month | Free tier |
| Pages | Unlimited | Free |
| DNS + Analytics | — | Free |
| **Total** | | **$0/month** (+ ~$1/mo domain) |

#### Scenario 2: Growing (10K visitors/month)

| Resource | Usage | Cost |
|----------|-------|------|
| Workers requests | 1.02M/month | Free tier (under 3M/month daily limit) |
| Durable Object requests | 20K/month | Free tier |
| KV reads | 1M/month | Free tier |
| KV writes | 20K/month | Free tier |
| **Total** | | **$0/month** |

#### Scenario 3: Getting Traction (100K visitors/month)

| Resource | Usage | Cost |
|----------|-------|------|
| Workers requests | 10.2M/month | Need paid plan. 10M included. Overage: 0.2M × $0.30 = $0.06 |
| Durable Object requests | 200K/month | Included in paid plan (1M free) |
| KV reads | 10M/month | Included in paid plan (10M free) |
| KV writes | 200K/month | Included in paid plan (1M free) |
| Paid plan base | — | $5.00 |
| **Total** | | **~$5/month** |

#### Scenario 4: Viral (1M visitors/month)

| Resource | Usage | Cost |
|----------|-------|------|
| Workers requests | 102M/month | 10M included. Overage: 92M × $0.30 = $27.60 |
| Durable Object requests | 2M/month | 1M included. Overage: 1M × $0.15 = $0.15 |
| KV reads | 100M/month | 10M included. Overage: 90M × $0.50 = $45.00 |
| KV writes | 2M/month | 1M included. Overage: 1M × $5.00 = $5.00 |
| Paid plan base | — | $5.00 |
| **Total** | | **~$83/month** |

**Optimization opportunity:** At this scale, we could reduce polling to every 5 seconds (cuts KV reads by 40%) and cache GET /stats responses at the edge for 2-3 seconds. This would drop the cost to ~$40-50/month.

#### Scenario 5: Mega Viral (10M visitors/month)

| Resource | Usage | Cost |
|----------|-------|------|
| Workers requests | 1.02B/month | 10M included. Overage: 1.01B × $0.30 = $303 |
| Durable Object requests | 20M/month | 1M included. Overage: 19M × $0.15 = $2.85 |
| KV reads | 1B/month | 10M included. Overage: 990M × $0.50 = $495 |
| KV writes | 20M/month | 1M included. Overage: 19M × $5.00 = $95 |
| Paid plan base | — | $5.00 |
| **Total (unoptimized)** | | **~$901/month** |

**With optimization** (poll every 5s + edge caching + batch KV writes): estimated **~$300-400/month**. At 10M visitors/month, this is a good problem to have — and the product should be generating sponsorship revenue by this point.

---

## 3. Cost Summary Table

| Visitors/month | Monthly cost | Cost per visitor |
|---------------:|------------:|:-----------------|
| 1,000 | $0 | Free |
| 10,000 | $0 | Free |
| 100,000 | ~$5 | $0.00005 |
| 1,000,000 | ~$83 | $0.00008 |
| 10,000,000 | ~$400 (optimized) | $0.00004 |

The cost per visitor actually goes *down* at scale because the $5 base fee gets amortized. Cloudflare's pricing is linear and predictable — no surprise bills.

---

## 4. Fixed Costs (Regardless of Traffic)

| Item | Cost | Frequency |
|------|-----:|-----------|
| Domain (notagain.one) | ~$12 | Per year |
| Cloudflare paid plan (when needed) | $5 | Per month |
| **Total fixed** | **~$72/year** | |

That's it. No database hosting, no Redis subscription, no server rental, no CDN fees. This is the advantage of the all-Cloudflare stack.

---

## 5. Break-Even Analysis

When does notagain need to start making money?

| Traffic | Monthly cost | Revenue needed |
|--------:|------------:|:---------------|
| Under 10K | $0 | None — it's free |
| 100K | $5 | A coffee per month |
| 1M | $83 | One modest sponsorship deal covers this |
| 10M | $400 | Multiple sponsorships or affiliate deals |

**Bottom line:** notagain can run for free until it has real traction. Even at 100K visitors/month, it costs less than a Netflix subscription. The product can be validated before any meaningful investment is needed.

---

## 6. Cost Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Polling creates high request volume | KV reads are the biggest cost driver at scale | Increase poll interval (3s → 5s → 10s) as traffic grows. Cache at edge. |
| Bot traffic inflates requests | Bots polling every 3 seconds burn through KV reads | Cloudflare WAF rate limiting (free). Bot detection at edge. |
| Viral spike with no revenue | Could hit $100+/month unexpectedly | Set Cloudflare spending alerts. Worst case: increase poll interval temporarily. |
| KV write costs at scale | $5/million adds up | Batch leaderboard updates. Only write to KV every 5-10 seconds, not on every tap. |

---

## 7. Comparison: What Would This Cost Elsewhere?

| Stack | Cost at 100K visitors/mo | Cost at 1M visitors/mo |
|-------|------------------------:|-----------------------:|
| **Cloudflare (our choice)** | ~$5 | ~$83 |
| Vercel Pro + Upstash Redis | ~$30 ($20 Vercel + $10 Upstash) | ~$120+ |
| AWS (Lambda + DynamoDB + CloudFront) | ~$15-25 | ~$100-200 |
| Firebase (Firestore + Hosting) | ~$10-20 | ~$150-300 (real-time connections expensive) |

Cloudflare is the cheapest option at every scale, primarily because Pages (static hosting) and DNS are completely free, and the $5 paid plan includes generous allowances.

---

*The cost structure is as simple as the product. That's by design.*
