import { useState, useEffect, useRef } from "react";
import { Share2, Volume2, VolumeX } from "lucide-react";

// ─── Colors (from design-direction.md §2) ─────────────────────────────────
const MINT = "#2DFFC0";
const DARK_BG = "#0A0F14";
const CARD_BG = "#111921";
const CARD_BORDER = "#1A2530";
const MUTED = "#5A6B7B";
const BODY_TEXT = "#9BA8B7";

// ─── Data ────────────────────────────────────────────────────────────────
const LEADERBOARD = [
  { region: "Asia-Pacific", emoji: "🌏", count: 811, medal: "🥇" },
  { region: "Americas", emoji: "🌎", count: 685, medal: "🥈", isYou: true },
  { region: "Europe & Africa", emoji: "🌍", count: 343, medal: "🥉" },
];

const ACHIEVEMENTS = [
  { id: "first-flush", name: "First Flush", desc: "Log your first session", icon: "🎉", earned: true },
  { id: "hat-trick", name: "Hat Trick", desc: "3 sessions in one day", icon: "🎩", earned: true },
  { id: "marathon", name: "Marathon", desc: "40+ minute session", icon: "🏃", earned: false },
  { id: "regular", name: "The Regular", desc: "7-day streak", icon: "📅", earned: false },
  { id: "night-owl", name: "Night Owl", desc: "Session after midnight", icon: "🌙", earned: true },
  { id: "century", name: "Century", desc: "100 total sessions", icon: "💯", earned: false },
  { id: "speed-run", name: "Speed Run", desc: "Under 2 minutes", icon: "⚡", earned: false },
  { id: "ten-timer", name: "Ten Timer", desc: "10 total sessions", icon: "🔟", earned: false },
];

// Voice & Tone (from design-direction.md §8)
const WITTY_SUBTEXTS = [
  "That's {count} people scrolling this instead of knocking.",
  "Solidarity. We're all in this together. Well, they're in there.",
  "Peak throne hours: 7-9am, 6-8pm. Like clockwork.",
  "Someone in Auckland just tapped Mine too. The throne is universal.",
  "The average visit is 8 minutes. Your partner disagrees.",
];

const TIME_COMMENTS = [
  { min: 0, text: "Just started. Give it time..." },
  { min: 5, text: "5 minutes. Still within normal range. Barely." },
  { min: 10, text: "10 minutes. They've found their phone. It's over." },
  { min: 15, text: "15 min. That's longer than most TED talks." },
  { min: 20, text: "20 min. They might be reading War and Peace." },
  { min: 30, text: "30 min! Longer than an episode of Friends." },
  { min: 45, text: "45 min. Should we send a search party?" },
  { min: 60, text: "An hour. Legend has it they're still in there..." },
];

const END_MESSAGES = [
  { maxMin: 5, text: "That was quick! A rare sighting indeed." },
  { maxMin: 10, text: "Not bad! Under 10 minutes. There's hope." },
  { maxMin: 15, text: "15 minutes. Right on schedule." },
  { maxMin: 25, text: "Classic. We're not judging. (We're judging a little.)" },
  { maxMin: 60, text: "Wow. That was... thorough. Very thorough." },
  { maxMin: Infinity, text: "We were genuinely worried. Welcome back to the world." },
];

const LANGUAGES = { en: "EN", zh: "中文", es: "ES" };

// ─── Component ───────────────────────────────────────────────────────────
export default function NotagainPrototype() {
  const [sessionState, setSessionState] = useState("idle");
  const [globalCount, setGlobalCount] = useState(1839);
  const [soundOn, setSoundOn] = useState(false);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [visitCount, setVisitCount] = useState(23);
  const [lastDuration, setLastDuration] = useState(null);
  const [subtextIndex, setSubtextIndex] = useState(0);
  const [showShareToast, setShowShareToast] = useState(false);
  const [animateBump, setAnimateBump] = useState(false);
  const [lang, setLang] = useState("en");
  const timerRef = useRef(null);

  // Fluctuate counter (simulates polling updates)
  useEffect(() => {
    const id = setInterval(() => {
      setGlobalCount((c) => c + Math.floor(Math.random() * 7) - 3);
    }, 2500);
    return () => clearInterval(id);
  }, []);

  // Rotate subtext
  useEffect(() => {
    const id = setInterval(() => {
      setSubtextIndex((i) => (i + 1) % WITTY_SUBTEXTS.length);
    }, 6000);
    return () => clearInterval(id);
  }, []);

  // Session timer
  useEffect(() => {
    if (sessionState === "active") {
      timerRef.current = setInterval(() => setSessionSeconds((s) => s + 1), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [sessionState]);

  const formatTimeLong = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m} min ${sec.toString().padStart(2, "0")} sec`;
  };

  const getTimeComment = (s) => {
    const min = Math.floor(s / 60);
    let comment = TIME_COMMENTS[0].text;
    for (const c of TIME_COMMENTS) {
      if (min >= c.min) comment = c.text;
    }
    return comment;
  };

  const getEndMessage = (s) => {
    const min = Math.floor(s / 60);
    for (const m of END_MESSAGES) {
      if (min < m.maxMin) return m.text;
    }
    return END_MESSAGES[END_MESSAGES.length - 1].text;
  };

  const handleMineToo = () => {
    setGlobalCount((c) => c + 1);
    setAnimateBump(true);
    setTimeout(() => setAnimateBump(false), 600);
    setSessionSeconds(0);
    setSessionState("active");
  };

  const handleTheyreBack = () => {
    setLastDuration(sessionSeconds);
    setGlobalCount((c) => c - 1);
    setVisitCount((v) => v + 1);
    setSessionState("ended");
    setTimeout(() => setSessionState("idle"), 8000);
  };

  const handleShare = () => {
    setShowShareToast(true);
    setTimeout(() => setShowShareToast(false), 2500);
  };

  const subtext = WITTY_SUBTEXTS[subtextIndex].replace("{count}", globalCount.toLocaleString());
  const card = `rounded-2xl border`;
  const cardStyle = { background: CARD_BG, borderColor: CARD_BORDER };

  // Fade transition style (design-direction.md §7: 300ms crossfade)
  const fadeStyle = {
    transition: "opacity 300ms ease, transform 300ms ease",
  };

  // ─── SINGLE PAGE ──────────────────────────────────────────────────
  return (
    <div className="flex justify-center items-center min-h-screen" style={{ background: "#060A0E" }}>
      <div
        className="w-[390px] h-[844px] rounded-3xl overflow-hidden flex flex-col relative"
        style={{ background: DARK_BG, boxShadow: "0 0 60px rgba(45,255,192,0.08)" }}
      >
        {/* ── Top bar (design-direction.md §4: header) ── */}
        <div className="flex items-center justify-between px-5 pt-4 pb-1">
          <div className="flex items-baseline gap-0.5">
            <span className="text-lg font-black" style={{ color: MINT }}>notagain</span>
            <span className="text-lg font-light text-white">.one</span>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              className="text-xs rounded-md px-2 py-1 border-0 outline-none cursor-pointer"
              style={{ background: CARD_BG, color: MUTED }}
            >
              {Object.entries(LANGUAGES).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <button onClick={() => setSoundOn(!soundOn)} style={{ color: MUTED }}>
              {soundOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>
          </div>
        </div>
        <p className="px-5 text-sm mb-3" style={{ color: MUTED }}>
          He's in the bathroom. Again.
        </p>

        {/* ── Scrollable content ── */}
        <div className="flex-1 overflow-y-auto px-5 pb-6" style={{ scrollbarWidth: "none" }}>

          {/* ═══ COUNTER CARD — transforms in-place (design-direction.md §5.1) ═══ */}
          <div className={`${card} w-full py-5 px-4 text-center`} style={cardStyle}>
            {sessionState === "idle" && (
              <div style={fadeStyle}>
                <p className="text-xs uppercase tracking-[0.2em] font-medium" style={{ color: MUTED }}>
                  Partners on the throne right now
                </p>
                {/* §5.1: 72-96px, bold, with subtle mint glow */}
                <div
                  className={`text-7xl font-black tabular-nums mt-3 transition-transform ${animateBump ? "scale-110" : "scale-100"}`}
                  style={{
                    color: MINT,
                    fontFamily: "system-ui, sans-serif",
                    textShadow: "0 0 40px rgba(45,255,192,0.3), 0 0 80px rgba(45,255,192,0.1)",
                  }}
                >
                  {globalCount.toLocaleString()}
                </div>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: MINT }} />
                  <span className="text-xs" style={{ color: MUTED }}>Live worldwide</span>
                </div>
              </div>
            )}

            {sessionState === "active" && (
              <div style={fadeStyle}>
                <p className="text-xs uppercase tracking-[0.2em] font-medium" style={{ color: MUTED }}>
                  Your partner has been in there for
                </p>
                <div
                  className="text-5xl font-black tabular-nums mt-3"
                  style={{
                    color: MINT,
                    fontFamily: "system-ui, sans-serif",
                    textShadow: "0 0 30px rgba(45,255,192,0.2)",
                  }}
                >
                  {formatTimeLong(sessionSeconds)}
                </div>
                <p className="text-xs mt-3 italic" style={{ color: MUTED }}>
                  {getTimeComment(sessionSeconds)}
                </p>
                <div className="flex items-center justify-center gap-2 mt-3">
                  <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: MINT }} />
                  <span className="text-xs" style={{ color: MUTED }}>
                    {globalCount.toLocaleString()} others are also waiting
                  </span>
                </div>
              </div>
            )}

            {sessionState === "ended" && (
              <div style={fadeStyle}>
                <p className="text-2xl font-bold text-white">They're back! 🎉</p>
                <p className="mt-2" style={{ color: BODY_TEXT }}>
                  That was <span className="font-bold" style={{ color: MINT }}>{formatTimeLong(lastDuration || 0)}</span>.
                </p>
                <p className="text-xs mt-2 italic max-w-[260px] mx-auto" style={{ color: MUTED }}>
                  {getEndMessage(lastDuration || 0)}
                </p>
              </div>
            )}
          </div>

          {/* ═══ ACTION BUTTON — transforms based on state (design-direction.md §5.2) ═══ */}
          {sessionState === "idle" && (
            <button
              onClick={handleMineToo}
              className="w-full py-4 rounded-xl text-xl font-bold mt-4 active:scale-95 transition-all flex items-center justify-center gap-2"
              style={{ background: MINT, color: DARK_BG }}
            >
              Mine too! <span className="text-2xl">🚽</span>
            </button>
          )}

          {sessionState === "active" && (
            <div className="flex gap-3 mt-4" style={fadeStyle}>
              {/* §5.2: "They're back!" = outlined mint border, mint text */}
              <button
                onClick={handleTheyreBack}
                className="flex-1 py-4 rounded-xl text-lg font-bold active:scale-95 transition-all border-2"
                style={{ borderColor: MINT, color: MINT, background: "transparent" }}
              >
                They're back! 🎉
              </button>
              {/* §5.2: "False alarm" = text-only, muted gray, smaller */}
              <button
                onClick={handleTheyreBack}
                className="px-4 py-4 rounded-xl text-sm font-medium active:scale-95 transition-all"
                style={{ color: MUTED }}
              >
                False alarm 😅
              </button>
            </div>
          )}

          {sessionState === "ended" && (
            <div className="flex gap-3 mt-4" style={fadeStyle}>
              <button
                onClick={handleShare}
                className="flex-1 py-4 rounded-xl text-lg font-bold active:scale-95 transition-all flex items-center justify-center gap-2"
                style={{ background: MINT, color: DARK_BG }}
              >
                <Share2 size={18} /> Share
              </button>
              <button
                onClick={() => setSessionState("idle")}
                className="px-5 py-4 rounded-xl text-sm font-medium active:scale-95 transition-all border"
                style={{ borderColor: CARD_BORDER, color: MUTED }}
              >
                Dismiss
              </button>
            </div>
          )}

          {/* ── Witty subtext (only when idle) — §8 rotating one-liners ── */}
          {sessionState === "idle" && (
            <p className="text-xs mt-3 italic text-center max-w-[300px] mx-auto leading-relaxed" style={{ color: MUTED }}>
              {subtext}
            </p>
          )}

          {/* ═══ YOUR STATS — §5.3: 2x2 grid ═══ */}
          <div className="mt-6">
            <p className="text-xs uppercase tracking-[0.15em] font-semibold mb-3" style={{ color: MUTED }}>
              Your Stats
            </p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: visitCount, label: "Total sessions" },
                { value: "42m", label: "Longest ever" },
                { value: "8m", label: "Avg duration" },
                { value: "3 🔥", label: "Day streak" },
              ].map((stat) => (
                <div key={stat.label} className={`${card} px-4 py-3`} style={cardStyle}>
                  <p className="text-2xl font-black" style={{ color: MINT }}>{stat.value}</p>
                  <p className="text-xs mt-0.5" style={{ color: MUTED }}>{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ═══ LEADERBOARD — §5.4: compact 3-row list (before achievements per §4 layout) ═══ */}
          <div className="mt-6">
            <p className="text-xs uppercase tracking-[0.15em] font-semibold mb-3" style={{ color: MUTED }}>
              Who's flushing most today
            </p>
            <div className={`${card} overflow-hidden`} style={cardStyle}>
              {LEADERBOARD.map((r, i) => (
                <div
                  key={r.region}
                  className={`flex items-center justify-between px-4 py-3 ${i < LEADERBOARD.length - 1 ? "border-b" : ""}`}
                  style={{ borderColor: CARD_BORDER, background: r.isYou ? "rgba(45,255,192,0.05)" : "transparent" }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{r.medal}</span>
                    <span className="text-lg">{r.emoji}</span>
                    <span className="text-sm font-medium" style={{ color: BODY_TEXT }}>
                      {r.region}
                      {r.isYou && (
                        <span className="text-xs ml-1.5 px-1.5 py-0.5 rounded" style={{ color: MINT, background: "rgba(45,255,192,0.1)" }}>
                          you
                        </span>
                      )}
                    </span>
                  </div>
                  <span className="text-lg font-black tabular-nums" style={{ color: MINT }}>
                    {r.count.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ═══ ACHIEVEMENTS — §5.5: earned = full color, unearned = dimmed (V2 feature) ═══ */}
          <div className="mt-6">
            <p className="text-xs uppercase tracking-[0.15em] font-semibold mb-3" style={{ color: MUTED }}>
              Achievements
            </p>
            <div className="grid grid-cols-2 gap-3">
              {ACHIEVEMENTS.map((a) => (
                <div
                  key={a.id}
                  className={`${card} px-3 py-3 ${a.earned ? "" : "opacity-30"}`}
                  style={{ ...cardStyle, borderColor: a.earned ? "#1A3530" : CARD_BORDER }}
                >
                  <span className="text-2xl">{a.icon}</span>
                  <p className="text-sm font-bold mt-1.5" style={{ color: a.earned ? BODY_TEXT : MUTED }}>{a.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: MUTED }}>{a.desc}</p>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Share toast (design-direction.md §7: slide up, hold, fade out — 2s total) */}
        {showShareToast && (
          <div
            className="absolute bottom-8 left-1/2 -translate-x-1/2 text-sm px-4 py-2 rounded-full shadow-lg font-medium"
            style={{
              background: MINT,
              color: DARK_BG,
              animation: "toastSlide 2.5s ease forwards",
            }}
          >
            Copied to clipboard! 📋
          </div>
        )}

        {/* Inline keyframes for toast animation */}
        <style>{`
          @keyframes toastSlide {
            0% { opacity: 0; transform: translate(-50%, 10px); }
            15% { opacity: 1; transform: translate(-50%, 0); }
            75% { opacity: 1; transform: translate(-50%, 0); }
            100% { opacity: 0; transform: translate(-50%, -5px); }
          }
        `}</style>
      </div>
    </div>
  );
}
