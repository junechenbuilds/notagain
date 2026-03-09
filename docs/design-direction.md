# Design Direction: notagain.one

**Phase:** 2d — Design Direction
**Date:** March 8, 2026
**Author:** June + Claude

---

## 1. Design Philosophy

notagain.one is a **lighthearted, single-purpose entertainment site**. The design should feel like a playful secret — something you pull up on your phone when you hear that bathroom door close. It's not a productivity tool. It's not a social network. It's a shared moment of solidarity wrapped in good humor.

**Three design principles:**

1. **Dark & cozy.** The site is used in quiet moments — on the couch, in bed, while waiting. A dark theme feels intimate and matches the "nighttime scrolling" mood of the target audience.

2. **One glance, one action.** Everything important is visible without scrolling. The big number draws you in. One button is all you need.

3. **Funny, not silly.** The humor is dry and relatable, like texting your best friend. Not cartoonish, not crude, not over the top.

---

## 2. Color Palette

| Role | Color | Hex | Usage |
|------|-------|-----|-------|
| **Background** | Near-black | `#0A0F14` | Page background |
| **Card background** | Dark navy | `#111921` | Content cards, sections |
| **Card border** | Deep slate | `#1A2530` | Subtle card borders |
| **Primary accent** | Mint green | `#2DFFC0` | Buttons, active states, key numbers, highlights |
| **Muted text** | Slate gray | `#5A6B7B` | Secondary text, descriptions, inactive elements |
| **Body text** | Soft gray | `#9BA8B7` | Primary readable text — soft enough to not compete with mint/white |
| **Heading text** | White | `#FFFFFF` | Headlines, the big counter number |

**Why mint green?** It pops against dark backgrounds without being aggressive. It feels fresh and modern — not clinical (blue), not alarming (red), not corporate (purple). Mint says "fun but tasteful."

**What to avoid:** Bright primary colors (red, blue, yellow). Pastel backgrounds. Gradients on large surfaces. Neon effects.

---

## 3. Typography

| Role | Font | Weight | Size | Notes |
|------|------|--------|------|-------|
| **The big number** | System sans-serif | Bold (700) | 72–96px | The star of the show. Uses tabular numerals so digits don't jump when the count changes. |
| **Section headings** | System sans-serif | Semi-bold (600) | 18–20px | Card titles, section labels |
| **Body text** | System sans-serif | Regular (400) | 14–16px | Descriptions, stats, witty subtexts |
| **Small labels** | System sans-serif | Medium (500) | 11–12px | Leaderboard labels, achievement descriptions, timestamps |

**Why system fonts?** The site should load instantly. No web font download delay. System sans-serif (`-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`) looks great on every platform and costs zero bytes.

**Text hierarchy:** The page should have one clear focal point (the counter number), supported by smaller text that you read if you want to but don't need to.

---

## 4. Layout & Spacing

**Mobile-first, single column.** The site is designed for phones first. Desktop gets the same layout centered in a comfortable reading width (max ~480px).

| Element | Spacing |
|---------|---------|
| Page padding | 16–20px sides |
| Between sections | 20–24px |
| Card padding | 16–20px |
| Card border radius | 12–16px |
| Between cards in a grid | 12px |

**The visual flow (top to bottom):**

```
┌─────────────────────────┐
│  🚽 notagain.one    🔊 EN│  ← Header: logo, sound toggle, language
├─────────────────────────┤
│                         │
│        1,839            │  ← THE NUMBER (hero element)
│  partners on the throne │
│  right now              │
│                         │
│     [ Mine too! 🚽 ]    │  ← Primary action button
│                         │
├─────────────────────────┤
│  Your Stats             │
│  ┌────┐ ┌────┐         │  ← 2x2 personal stats grid
│  │ 23 │ │ 42m│         │
│  └────┘ └────┘         │
│  ┌────┐ ┌────┐         │
│  │ 8m │ │ 3🔥│         │
│  └────┘ └────┘         │
├─────────────────────────┤
│  🥇 Asia-Pacific   811  │  ← Regional leaderboard (compact)
│  🥈 Americas       685  │
│  🥉 Europe         343  │
├─────────────────────────┤
│  Achievements            │  ← Badge grid (earned vs locked)
│  🎉 🎩 🌙 ⚡ 💯 🏃 📅 🔟│
└─────────────────────────┘
```

---

## 5. Components

### 5.1 The Counter Card

The centerpiece. A large card with the global count displayed prominently.

- **Number styling:** 72–96px, bold, white, with a subtle mint glow/shadow
- **Subtitle:** Witty rotating subtext in muted gray, 14px
- **State transitions:** The card transforms in-place between three states (idle, active, ended) — never navigates to a new page

### 5.2 The Button

One button. Changes label based on state.

| State | Label | Style |
|-------|-------|-------|
| Idle | "Mine too! 🚽" | Solid mint background, dark text, large (full-width), rounded |
| Active | "They're back!" | Outlined mint border, mint text |
| Active (secondary) | "False alarm" | Text-only, muted gray, smaller |
| Ended | "Share" + "Dismiss" | Two buttons side by side |

**Button feel:** Rounded corners (12px), subtle press animation (scale down slightly on tap), generous padding so it's easy to tap on mobile.

### 5.3 Stats Grid

4 cards in a 2x2 grid showing personal stats:

- **Times joined** — visit count
- **Longest wait** — formatted as "42m" or "1h 12m"
- **Average** — average session duration
- **Streak** — consecutive days (with 🔥 emoji)

Each card: dark background, small label in muted text, large number/value in white.

### 5.4 Leaderboard

Compact 3-row list. Each row shows medal emoji, region name, and count. The user's region is highlighted with a mint accent.

### 5.5 Achievements

A grid of emoji badges. Earned badges are full color. Unearned badges are dimmed (opacity ~30%). Tapping a badge could show its name and description in a tooltip (V2).

---

## 6. Iconography & Emoji

**Primary approach: Emoji, not icon libraries.** Emoji are universal, zero-cost, and match the playful tone. They also render natively on every platform.

| Usage | Emoji |
|-------|-------|
| Toilet/throne | 🚽 |
| Sound on | 🔊 |
| Sound off | 🔇 |
| Streak / fire | 🔥 |
| Regions | 🌎 🌍 🌏 |
| Medals | 🥇 🥈 🥉 |
| Achievements | 🎉 🎩 🏃 📅 🌙 💯 ⚡ 🔟 |
| Share | Use Lucide `Share2` icon (platform-native share is expected to look like an icon, not emoji) |

**When to use Lucide icons:** Only for functional UI elements (share button, close button, navigation). Everything decorative uses emoji.

---

## 7. Motion & Animation

Keep it subtle. This isn't a game — it's a website with personality.

| Element | Animation | Duration |
|---------|-----------|----------|
| Counter number change | Gentle bump/scale effect | 200ms |
| Button press | Scale to 0.95 then back | 150ms |
| State transition (idle→active→ended) | Fade/crossfade | 300ms |
| Achievement earned | Brief bounce | 300ms |
| Toast notification (share copied) | Slide up, hold, fade out | 2s total |

**What NOT to animate:** Background elements, card layouts, the leaderboard, scrolling. Keep the page feeling solid and grounded.

---

## 8. Voice & Tone (UI Copy)

The voice is like a witty friend who shares your situation.

**Tone:** Dry humor, warm, conspiratorial ("we're in this together"), never mean-spirited about the partner.

**Do:**
- "Partners on the throne right now" (not "people using the toilet")
- "They're back!" (not "End session")
- "That was... thorough." (not "Session ended")
- "Someone in Auckland just tapped Mine too" (worldly, funny)

**Don't:**
- Crude bathroom humor or explicit content
- Anything that makes the partner the butt of a mean joke
- Corporate/app-like language ("Your session has been terminated")
- Exclamation overload!!!

**Key copy elements:**
- **Tagline:** "Partners on the throne right now"
- **CTA:** "Mine too! 🚽"
- **End session:** "They're back!"
- **Quick exit:** "False alarm"
- **Witty subtexts:** Rotating funny one-liners below the counter (see prototype for examples)
- **Time comments:** Escalating humor as the session gets longer ("5 minutes. Still within normal range. Barely.")
- **End messages:** Matched to duration ("That was quick!" vs "We were genuinely worried.")

---

## 9. Responsive Behavior

| Viewport | Behavior |
|----------|----------|
| **Mobile (< 480px)** | Full-width layout, 16px padding, counter at 72px |
| **Tablet (480–768px)** | Centered column at 480px max, 20px padding |
| **Desktop (> 768px)** | Centered column at 480px max, counter can go up to 96px, more breathing room |

The site is the same on every screen — just centered with comfortable margins on larger screens. No sidebar, no multi-column layout, no desktop-specific features.

---

## 10. Accessibility

- **Color contrast:** Mint (#2DFFC0) on dark (#0A0F14) = 12.4:1 contrast ratio (exceeds WCAG AAA)
- **White (#FFFFFF) on dark (#0A0F14)** = 19.1:1 (exceeds WCAG AAA)
- **Body text (#9BA8B7) on dark (#0A0F14)** = 7.1:1 — exceeds WCAG AAA. Readable but receded.
- **Muted text (#5A6B7B) on dark (#0A0F14)** = 3.7:1 — passes WCAG AA for large text. For small text, use sparingly.
- **Tap targets:** Minimum 44x44px for all interactive elements
- **Reduced motion:** Respect `prefers-reduced-motion` — disable animations for users who prefer it
- **Screen readers:** Counter card and button should have proper ARIA labels ("1,839 partners currently on the throne" not just "1839")

---

## 11. What We're NOT Doing

- **No light mode.** The dark theme IS the brand. It creates the right mood.
- **No custom illustrations.** Emoji handle the personality. Custom art adds cost and maintenance.
- **No onboarding flow.** The page is self-explanatory. One button, one number.
- **No splash screen or loading animation.** Instant content. The number should be visible within 1 second.

---

*The design should feel like it was built by someone with great taste who didn't overthink it. Simple, dark, funny, and fast.*
