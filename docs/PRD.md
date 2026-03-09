# PRD: notagain

**Version:** 1.0
**Date:** March 6, 2026
**Phase:** 2a — Product Definition
**Author:** June + Claude

---

## 1. Product Overview

### One-Line Description
A simple, fun website that shows how many partners are "on the loo right now" — tap "Mine too!" to join the count, and see regional + global leaderboards. No accounts, no sign-ups, just fun.

### Problem Statement
Women in relationships universally experience the "he's disappeared to the bathroom for 30 minutes again" moment. It's funny, it's frustrating, and it's incredibly relatable. But there's nowhere to go in that moment — no destination that says "you're not alone, there are thousands of us right now." Current humor platforms (TikTok, Instagram) bury this content in algorithmic noise. notagain gives this moment a home.

### Target Audience
Women 25-45 in relationships who find daily domestic humor relatable. Primarily English-speaking markets (US, UK, Canada, Australia).

### Product Type
Simple, fast-loading website (not a native app). Think a fun communal experience, not a complex platform.

---

## 2. Core Concept

The heart of notagain is a single, bold number on screen:

> **Right now, 2,847 partners are on the loo.**

Below it, a big button: **"Mine too! 🚽"**

Tapping it adds you to the count. The number ticks up. You're part of a silent, funny solidarity with thousands of other people experiencing the same thing at the same moment.

This is the hook. Everything else builds around it.

---

## 3. Features

### 3.1 MVP Features (Launch)

#### 3.1.1 The Live Counter (Hero Feature)
- **What:** A large, prominently displayed number showing how many partners are currently "on the loo" in the user's region (with global total also visible)
- **How it works:**
  - User arrives at the site and sees the current count
  - Taps "Mine too!" button to add themselves
  - The count increments in real time (with a satisfying animation)
  - After tapping, the user is "in session" — their partner is on the loo
  - User can tap "They're back!" (or similar) to end the session, which decrements the count
  - Sessions auto-expire after 60 minutes (let's be realistic... or not)
- **Tone:** The number should feel alive — gently animating, maybe with subtle fluctuations. It should feel like a live dashboard of a shared human experience.
- **Fun touches:**
  - Milestone celebrations ("We just hit 10,000 simultaneous loo visits!")
  - Time-of-day commentary ("It's 8am — peak loo hour. Of course.")
  - Witty subtexts that rotate: "That's 2,847 people scrolling this instead of knocking on the door"

#### 3.1.2 The "Mine Too!" Button
- **What:** The primary call-to-action. One tap to join the count.
- **Behavior:**
  - Before tap: Shows "Mine too! 🚽" — large, inviting, slightly playful
  - After tap: Transforms to show your active session ("Your partner has been in there for 12 min 34 sec")
  - Shows a small personal timer counting up
  - Option to end: "They're back!" button (or "False alarm" for fun)
- **No sign-up required** for basic "Mine too!" — works immediately
- **Light animation on tap** — the counter visibly ticks up, with optional toilet flush sound effect (off by default, toggleable via a small 🔇/🔊 icon)

#### 3.1.3 Regional Leaderboard
- **What:** A fun scoreboard showing which cities/regions have the most active loo sessions right now
- **How it works:**
  - Detects approximate location via IP (no GPS needed, no sign-up)
  - Three main regions: Americas, Europe, Asia-Pacific
  - Shows ranked list within each region: "London: 412 | Manchester: 89 | Dublin: 34 | ..."
  - Global total always visible at the top
  - Updates in real time
  - User's own region shown by default, can toggle to see others
- **Purpose:** Adds a communal, competitive element. "Our city is winning!" It also gives users something to browse while they wait.
- **Privacy:** Uses approximate location only (city level from IP). No precise tracking. Clear privacy note.
- **Fun touches:**
  - Crown/trophy icon for the top city in each region
  - "Your city is #3 right now — we need 18 more to overtake Melbourne!"
  - Time zone awareness: "It's morning in London — the breakfast loo rush is ON"

#### 3.1.4 Shareable Moment
- **What:** Easy sharing so users can tell friends
- **How it works (MVP — Option A + C):**
  - **Text snippet (Option A):** "Share" button copies a fun text to clipboard or triggers native share sheet: "Right now 1,839 partners are on the throne. Mine is one of them. 🚽 notagain.one"
  - Works with native share sheet (mobile) or copy-to-clipboard (desktop)
  - **Open Graph preview (Option C):** The homepage has OG meta tags so any shared link to notagain.one renders a rich preview card with the tagline, branding, and a fun image — no extra effort from the sharer
- **V2 upgrade:** Shareable image card or personalized link with session stats (e.g., "My partner just spent 23 minutes on the throne")

---

### 3.2 V2 Features (Post-Launch, if users love it)

#### 3.2.1 Fun Facts & Humor Feed
- **What:** While your timer is running, swipeable cards appear with funny facts, relatable content, and witty observations
- **Examples:**
  - "The average man spends 1.5 years of his life on the toilet. Your partner may be above average."
  - Rotating daily "excuse of the day" — funny excuses partners give
  - Bathroom trivia, funny statistics, relatable quotes
- **How it works:**
  - Cards appear below the timer during an active session
  - Swipe left/right to browse
  - New content rotates daily
  - No account needed — just content that appears while you wait
- **Purpose:** Gives users something to do while they wait. Increases time on site and gives a reason to come back.

#### 3.2.2 Achievements (Badge System)
- **What:** Unlockable badges stored in LocalStorage that reward usage milestones — a lightweight gamification layer with no accounts needed
- **Examples:**
  - **First Flush** — Log your first session
  - **Hat Trick** — 3 sessions in one day
  - **Marathon** — 40+ minute session
  - **The Regular** — 7-day visit streak
  - **Night Owl** — Session after midnight
  - **Century** — 100 total sessions
  - **Speed Run** — Session under 2 minutes
  - **Ten Timer** — 10 total sessions
- **How it works:**
  - Displayed as a 2-column grid on the home screen below personal stats
  - Earned badges are fully visible with colored borders; unearned badges are greyed out
  - All tracking via LocalStorage (visit timestamps, session durations, streak counts)
  - New badge unlocks trigger a brief celebratory animation
- **Purpose:** Gives returning visitors goals to work toward. Encourages daily visits (streaks) and exploration (time-based badges). No accounts, no pressure — just fun.

---

### 3.3 Future Considerations (V3+)

- **Seasonal events** — "Super Bowl Loo Rush", "Christmas Morning Tracker"
- **API / widget** — embeddable live counter for blogs, social media
- **Merchandise** — "Official Loo Widow" mugs, "Not Again" t-shirts (print-on-demand)

---

## 4. User Flows

### Flow 1: First-Time Visitor
1. Lands on notagain.com
2. Language auto-detected from browser settings (English / Chinese / Spanish), with manual toggle available
3. Sees the big live counter: "Right now, 2,847 partners are on the loo"
4. Reads witty subtext
5. Taps "Mine too!"
6. Counter animates +1. Their session starts.
7. Sees their personal timer: "Your partner has been in there for 0 min 12 sec"
8. Scrolls down to see regional leaderboard
9. When partner returns, taps "They're back!"
10. Sees a funny summary: "That was 23 minutes. The average is 18. Your partner is... thorough."
11. Option to share, or come back next time
12. LocalStorage saves: language preference, visit count, last session duration

### Flow 2: Returning Visitor
1. Returns to site (bookmarked or remembered)
2. LocalStorage recognized — language preference restored, visit count incremented
3. Sees current counter + a small welcome-back line: "Welcome back! This is visit #12."
4. Taps "Mine too!" — familiar flow
5. After session ends, LocalStorage updates personal stats (total visits, average duration, longest session)
6. Funny stat shown: "Your partner's lifetime loo count: 47 visits. That's... a lot."

---

## 5. Design Principles

1. **Dead simple.** One screen, one button, one number. A toddler could use it.
2. **Funny first.** Every piece of copy should make you smile. No corporate tone.
3. **Fast.** Page loads in under 2 seconds. No bloat.
4. **Mobile-first.** 90%+ of traffic will be mobile (people waiting for their partner). Must look and feel great on a phone.
5. **No dark patterns.** No forced sign-ups, no aggressive upsells, no manipulative engagement tricks.
6. **Privacy-respectful.** IP-based location only for leaderboard. No tracking beyond what's needed. Clear about what data exists.

---

## 6. Technical Requirements

### 6.1 Platform
- **Simple website** — HTML/CSS/JS, hosted on a fast CDN
- **Real-time counter:** WebSocket or Server-Sent Events for live updates
- **Backend:** Lightweight API for counter state, session management, leaderboard data
- **Database:** Store active sessions and regional counts (server-side). Personal stats stored in browser LocalStorage (no server-side user data).
- **LocalStorage:** Persists returning visitor data: language preference, total visit count, session history (durations), longest session, personal bests. No account needed.
- **i18n:** Support 3 languages — English, Chinese (Simplified), Spanish. Auto-detect from browser `navigator.language`, with manual toggle. All UI copy, fun facts, and witty subtexts translated.
- **No app store.** Just a URL.

### 6.2 Performance
- Page load: < 2 seconds on 3G
- Counter updates: < 500ms latency
- Works without JavaScript for basic content (progressive enhancement)
- Mobile-first responsive design

### 6.3 Scale Considerations
- Counter needs to handle concurrent updates (thousands of taps per minute during peak)
- Regional leaderboard needs efficient geo-lookup
- If viral: must handle sudden traffic spikes (design for 10x expected load)

---

## 7. Success Metrics

### Launch (First 30 Days)
| Metric | Target | Why |
|---|---|---|
| Unique visitors | 10,000+ | Validates interest |
| "Mine too!" taps | 5,000+ | Validates engagement |
| Return visitors (within 7 days) | 20%+ | Validates stickiness |
| Average session duration | 2+ minutes | Users stay and explore |
| Social shares | 500+ | Validates virality |

### Growth (90 Days)
| Metric | Target | Why |
|---|---|---|
| Monthly unique visitors | 50,000+ | Growing awareness |
| Daily "Mine too!" taps | 1,000+ | Daily habit forming |
| Account sign-ups (V2 tracker) | 5,000+ | Users want more |
| Organic traffic share | 40%+ | Word of mouth working |

---

## 8. Monetization (Phase 1)

For MVP launch, the site should be **completely free with no ads.** The goal is to validate the concept and build an audience.

Monetization options to explore post-validation:
- **Tasteful sponsorship** — "Today's loo wait brought to you by [brand]" (one sponsor, not banner ads)
- **Premium tracker** — Free basic tracking, paid for detailed stats/reports
- **Merchandise** — "Not Again" branded items (print-on-demand)
- **Affiliate** — Funny gift recommendations ("Buy your partner a book to read instead?")

---

## 9. Content & Copy Guidelines

The voice of notagain is:
- **Warm and funny** — laughing WITH the user, never AT anyone
- **Relatable** — "we've all been there" energy
- **Cheeky but kind** — playful eye-roll, not mean-spirited
- **Gender-inclusive in spirit** — primarily targets women but the humor is universal. Anyone can use it.
- **Brief** — short, punchy copy. No paragraphs. Every word earns its place.

**Examples of good notagain copy:**
- "Right now, 3,412 people are waiting for someone to leave the bathroom. You're not alone."
- "Your partner has been in there for 27 minutes. That's longer than an episode of Friends."
- "Peak loo hours: 7-9am, 6-8pm. You could set your clock by it."
- "They're back! That was 34 minutes. We're not judging. (We're judging a little.)"

---

## 10. Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Concept is too simple / one-joke | High | V2 fun facts feed adds depth. LocalStorage stats give returning visitors a personal touch. But MVP must validate the joke lands. |
| Privacy concerns (location data) | Medium | Only IP-based city-level. No accounts, no server-side personal data. Clear privacy policy. |
| Low retention after novelty wears off | High | LocalStorage personal stats, fresh rotating copy, fun facts feed (V2). The communal counter itself creates a reason to check back. |
| Fake taps / bots inflating counter | Medium | Rate limiting, session validation, basic bot detection |
| Partner doesn't find it funny | Low | Position as harmless fun. Copy is always affectionate, never mean. |

---

## 11. Out of Scope (All Versions)

- Native mobile app (website only, forever)
- User accounts / sign-ups (never — all personal data lives in browser LocalStorage)
- Server-side personal data storage (everything personal stays in the browser)
- Heavy gamification beyond V2 badges (no XP systems, no competitive rankings between users)
- Partner-sharing features
- Push notifications
- Monetization (validate first)

---

## 12. Open Questions

1. ~~Should the counter show global or country-specific by default?~~ **DECIDED:** Regional by default (3 regions: Americas, Europe, Asia-Pacific) with global total always visible.
2. ~~Sound effects — yes or no?~~ **DECIDED:** Yes — opt-in toilet flush sound effect on "Mine too!" tap. Off by default, toggleable.
3. ~~Should sessions be visible to others?~~ **DECIDED:** No. Sessions are private. No "Sarah from London just tapped" style activity feeds. Privacy wins.
4. ~~Cookie-based or fully anonymous?~~ **DECIDED:** LocalStorage for returning visitor recognition and personal stats. No accounts, no server-side user data.
5. ~~Domain?~~ **DECIDED:** notagain.one (registered).
6. ~~Languages?~~ **DECIDED:** 3 languages at launch — English, Chinese (Simplified), Spanish. Auto-detect from browser settings.

---

*This PRD is a living document. Will be updated as we progress through Definition and Build phases.*
