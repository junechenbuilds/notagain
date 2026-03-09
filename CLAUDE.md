# notagain
A funny, lighthearted entertainment app for wives/girlfriends to enjoy when their partner is on the loo (again).

## Target Audience
Women 25-45 in relationships who find daily domestic humor relatable — especially the universal "he's disappeared to the bathroom for 30 minutes" moment.

## Tech Stack
- **Frontend:** Static HTML/CSS/JS on Cloudflare Pages (global CDN)
- **Backend:** Cloudflare Workers (serverless, globally distributed)
- **Real-time:** Polling (every 3 seconds) for live counter updates
- **Data:** Cloudflare Durable Objects (counter) + KV (leaderboard cache)
- **Geo:** Cloudflare cf.continent header (free, automatic)
- **Analytics:** Cloudflare Web Analytics (cookieless, free)
- **DNS/SSL:** Cloudflare (notagain.one)

## Key Docs
All product documentation is in the `docs/` folder. Read these before making changes:
- `docs/PRD.md` — feature spec and requirements
- `docs/architecture.md` — system design and tech decisions
- `docs/PRODUCT_BRIEF.md` — product overview and context
- `docs/competitive-analysis.md` — Phase 1a competitive landscape
- `docs/user-research.md` — Phase 1b user research
- `docs/market-sizing.md` — Phase 1c market sizing
- `docs/monetization.md` — Phase 1d monetization strategy
- `docs/design-direction.md` — Phase 2d style guide
- `docs/roadmap.md` — Phase 2e feature prioritization
- `docs/cost-analysis.md` — Phase 2f cost estimation
- `docs/vc-lens-review.md` — Phase 2g VC evaluation
- `docs/learning.md` — Technical learnings and decisions

## Current Status
Phase 2: Definition — COMPLETE ✓
- All Discovery (Phase 1) complete. Blue ocean opportunity confirmed.
- All Definition (Phase 2) complete: PRD (2a), Prototype (2b), Architecture (2c), Design Direction (2d), Roadmap (2e), Cost Analysis (2f), VC Lens Review (2g).
- Next: Phase 3 — Build, Go-to-Market, and Validation (can run in parallel).
