# Roadmap: notagain.one

**Phase:** 2e — Feature Prioritization & Roadmap
**Date:** March 8, 2026
**Author:** June + Claude

---

## Approach

Using a **Now / Next / Later** framework because notagain is a solo builder project — we need clarity on what to build first, not quarterly timelines with fake dates. Each tier is prioritized using effort vs. impact.

---

## NOW — MVP Launch

**Goal:** Get the core experience live. Validate that the joke lands and people come back.

| # | Feature | Effort | Impact | Notes |
|---|---------|--------|--------|-------|
| 1 | **Live global counter** — the big number | Medium | Critical | The entire product IS this. Cloudflare Durable Object for consistency. |
| 2 | **"Mine too!" button** — start a session | Low | Critical | Single POST to backend. Animates the counter. |
| 3 | **"They're back!" / "False alarm"** — end a session | Low | Critical | POST to end. Shows duration summary with witty message. |
| 4 | **Session timer** — "Your partner has been in there for..." | Low | High | Client-side timer. Makes the wait feel shared. |
| 5 | **Witty rotating subtexts** | Low | High | Array of strings, rotated on interval. Sets the tone. |
| 6 | **Time-based comments** — escalating humor as session goes on | Low | High | Simple time bracket → message mapping. |
| 7 | **End-of-session summary** — funny message matched to duration | Low | High | Same pattern as time comments. Moment of delight. |
| 8 | **Regional leaderboard** — 3 regions with medals | Low | Medium | Read from KV cache. Cloudflare cf.continent header for detection. |
| 9 | **Personal stats** — total sessions, longest, average, streak | Low | Medium | All LocalStorage. No backend needed. |
| 10 | **Share button** — text snippet to clipboard / native share | Low | High | Key viral mechanic. Copy text or trigger navigator.share(). |
| 11 | **OG meta tags** — rich link preview when URL is shared | Low | High | Static HTML meta tags. Zero runtime cost. Huge viral ROI. |
| 12 | **Sound toggle** — opt-in toilet flush on "Mine too!" | Low | Low | Fun detail. Off by default. Single audio file. |
| 13 | **Language toggle** — EN / 中文 / ES | Medium | Medium | JSON translation files. Auto-detect from navigator.language. |
| 14 | **Session auto-expiry** — 60-min TTL | Low | Medium | Cron worker every 5 min. Prevents ghost sessions. |
| 15 | **Rate limiting** — 1 session per IP, 10 taps/hour | Low | Medium | Cloudflare WAF rules. Prevents bot spam. |
| 16 | **Mobile-first responsive design** | Medium | Critical | Single-column layout. Dark theme. System fonts. |
| 17 | **Privacy-first** — no cookies, no tracking, no accounts | Low | High | It's what we DON'T build. Just Cloudflare Web Analytics (cookieless). |

**MVP estimated effort:** 2-3 weeks for a solo builder (frontend + backend + deploy).

**MVP launch checklist:**
- [ ] Static site on Cloudflare Pages (notagain.one)
- [ ] Worker API on Cloudflare Workers (api.notagain.one)
- [ ] Durable Object for counter
- [ ] KV for leaderboard cache
- [ ] Cron trigger for session expiry
- [ ] OG meta tags + social preview image
- [ ] Cloudflare Web Analytics enabled
- [ ] 3 language translations complete
- [ ] Tested on iOS Safari, Android Chrome, desktop Chrome/Firefox

---

## NEXT — V2 (After Launch Validation)

**Goal:** Give returning visitors reasons to come back. Only build these if MVP metrics show retention potential (>15% 7-day return rate).

| # | Feature | Effort | Impact | Trigger |
|---|---------|--------|--------|---------|
| 1 | **Achievements / badges** — 8 unlockable milestones | Medium | High | Build when return rate > 15%. Gives daily visit goals. |
| 2 | **Fun Facts Feed** — swipeable humor cards during active session | Medium | High | Build when avg session > 2 min. Content for the wait. |
| 3 | **Shareable image card** — personalized session summary graphic | Medium | Medium | Build when share rate > 5%. Better viral mechanic. |
| 4 | **Milestone celebrations** — "We just hit 10K simultaneous!" | Low | Medium | Build when counter regularly exceeds 5K. |
| 5 | **Welcome-back personalization** — "This is visit #12!" | Low | Medium | Build alongside achievements. Uses same LocalStorage data. |
| 6 | **Personalized share link** — "My partner spent 23 min on the throne" | Medium | Medium | Build when shareable image is done. |

**V2 estimated effort:** 2-3 weeks additional.

---

## LATER — V3+ (If It Takes Off)

**Goal:** Explore monetization and expand the experience. Only if monthly uniques > 50K.

| # | Feature | Effort | Impact | Trigger |
|---|---------|--------|--------|---------|
| 1 | **Tasteful sponsorship** — "Today's wait brought to you by..." | Low | Medium | When traffic justifies it. Simple KV entry, not an ad network. |
| 2 | **Seasonal events** — "Super Bowl Loo Rush", "Christmas Morning Tracker" | Medium | High | Build around cultural moments. Time-limited counter themes. |
| 3 | **City-level leaderboard** — more granular than 3 regions | Medium | Medium | Needs cf.city header or MaxMind lookup. |
| 4 | **Embeddable widget** — live counter for blogs/social | Medium | Medium | API endpoint + iframe embed code. |
| 5 | **Merchandise** — "Not Again" mugs, "Official Loo Widow" shirts | Low (print-on-demand) | Low | When brand recognition exists. |
| 6 | **Affiliate recommendations** — funny gift ideas | Low | Low | Only if it fits the tone. Never pushy. |
| 7 | **Contact page for advertisers** | Low | Low | Simple email link. Build when traffic > 100K/mo. |

---

## What We're NOT Building (Ever)

These are intentionally excluded — not just deferred, but rejected:

- Native mobile app (website only, forever)
- User accounts / sign-ups
- Server-side personal data
- XP systems / competitive user rankings
- Partner-sharing / social features
- Push notifications
- Aggressive ads or ad networks

---

## Build Order Recommendation

For June as a solo builder, here's the suggested order for MVP:

**Week 1: Core loop**
1. Set up Cloudflare Pages + Workers + Durable Object
2. Build the counter API (POST /tap, POST /end, GET /stats)
3. Build the homepage with counter display + "Mine too!" button
4. Add session timer and "They're back!" flow
5. Add session auto-expiry cron

**Week 2: Polish & content**
6. Witty subtexts, time comments, end-of-session messages
7. Regional leaderboard (3 regions)
8. Personal stats (LocalStorage)
9. Share button + OG meta tags
10. Sound toggle
11. Language translations (EN/ZH/ES)

**Week 3: Ship**
12. Mobile responsive polish
13. Rate limiting via Cloudflare WAF
14. Cross-browser testing
15. Deploy to notagain.one
16. Set up Cloudflare Web Analytics

---

## Decision Criteria for Moving Between Tiers

| Move from | To | When |
|-----------|-----|------|
| NOW → ship | V2 planning | MVP live + 30 days of data |
| V2 planning → V2 build | Actual build | 7-day return rate > 15% AND avg session > 2 min |
| V2 → V3 | V3 planning | Monthly uniques > 50K |

Don't build ahead of validation. The MVP exists to answer one question: **"Do people find this funny enough to come back?"**

---

*Keep it simple. Ship fast. Let users tell you what to build next.*
