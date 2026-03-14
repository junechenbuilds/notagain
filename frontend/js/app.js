import { fetchStats, postTap, postEnd } from './api.js';
import { renderCounter, renderLeaderboard, renderStats, showState, showToast, animateBump } from './ui.js';
import { startTimer, stopTimer, getSessionSeconds, formatTimeLong } from './timer.js';
import { loadStats, saveSession, getStats } from './stats.js';
import { initI18n, setLang, t, getCurrentLang } from './i18n.js';
import { share } from './share.js';
import { initSound, playFlush, toggleSound } from './sound.js';

// ─── State ─────────────────────────────────────────────────
let state = 'idle';
let sessionId = null;
let userRegion = null;
let pollInterval = null;
let subtextInterval = null;
let subtextIndex = 0;

// ─── Init ──────────────────────────────────────────────────
async function init() {
  await initI18n();

  const personalStats = loadStats();
  renderStats(personalStats);

  initSound();

  try {
    const data = await fetchStats();
    userRegion = data.userRegion;
    renderCounter(data.globalCount);
    renderLeaderboard(data.regionCounts, userRegion);
  } catch {
    renderCounter(0);
    renderLeaderboard({ americas: 0, europe: 0, asiaPacific: 0 }, 'americas');
  }

  startPolling();
  rotateSubtext();
  subtextInterval = setInterval(rotateSubtext, 6000);
  bindEvents();
}

// ─── Polling ───────────────────────────────────────────────
function startPolling() {
  pollInterval = setInterval(async () => {
    try {
      const data = await fetchStats();
      if (state === 'idle') {
        renderCounter(data.globalCount);
      } else if (state === 'active') {
        const othersText = t('session.othersWaiting') || '{count} others are also waiting';
        document.getElementById('others-waiting').textContent =
          othersText.replace('{count}', data.globalCount.toLocaleString());
      }
      renderLeaderboard(data.regionCounts, userRegion || data.userRegion);
    } catch {
      // Silent fail — next poll will retry
    }
  }, 3000);
}

// ─── Events ────────────────────────────────────────────────
function bindEvents() {
  document.getElementById('btn-mine-too').addEventListener('click', handleMineToo);
  document.getElementById('btn-theyre-back').addEventListener('click', handleEnd);
  document.getElementById('btn-false-alarm').addEventListener('click', handleFalseAlarm);
  document.getElementById('btn-share').addEventListener('click', handleShare);
  document.getElementById('btn-dismiss').addEventListener('click', handleDismiss);
  document.querySelectorAll('.lang-btn').forEach((btn) => {
    btn.addEventListener('click', handleLangChange);
  });
  document.getElementById('sound-toggle').addEventListener('click', toggleSound);
}

async function handleLangChange(e) {
  const lang = e.target.dataset.lang;
  if (!lang || lang === getCurrentLang()) return;

  // Update active state on buttons
  document.querySelectorAll('.lang-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.lang === lang);
  });

  await setLang(lang);
  // Reset subtext rotation so it picks up the new language
  subtextIndex = 0;
  rotateSubtext();
}

async function handleMineToo() {
  try {
    const data = await postTap();
    sessionId = data.sessionId;
    userRegion = data.region;

    animateBump();
    renderCounter(data.globalCount);
    renderLeaderboard(data.regionCounts, data.region);
    playFlush();

    state = 'active';
    showState('active');

    startTimer((seconds) => {
      document.getElementById('session-timer').textContent = formatTimeLong(seconds);
      document.getElementById('time-comment').textContent = getTimeComment(seconds);
    });
  } catch (err) {
    showToast(err.message || 'Something went wrong');
  }
}

async function handleEnd() {
  if (!sessionId) return;

  const currentSeconds = getSessionSeconds();
  stopTimer();

  try {
    const data = await postEnd(sessionId);
    const duration = data.duration || currentSeconds;

    document.getElementById('final-duration').textContent = formatTimeLong(duration);
    document.getElementById('end-message').textContent = getEndMessage(duration);

    state = 'ended';
    showState('ended');
    renderCounter(data.globalCount);
    renderLeaderboard(data.regionCounts, userRegion);

    saveSession(duration);
    renderStats(getStats());
  } catch {
    // Even if API fails, end the session locally
    document.getElementById('final-duration').textContent = formatTimeLong(currentSeconds);
    document.getElementById('end-message').textContent = getEndMessage(currentSeconds);

    state = 'ended';
    showState('ended');

    saveSession(currentSeconds);
    renderStats(getStats());
  }

  sessionId = null;
}

async function handleFalseAlarm() {
  if (!sessionId) return;

  stopTimer();

  try {
    const data = await postEnd(sessionId);
    renderCounter(data.globalCount);
    renderLeaderboard(data.regionCounts, userRegion || data.userRegion);
  } catch {
    // Silent fail — counter will self-correct on next poll
  }

  sessionId = null;
  state = 'idle';
  showState('idle');
  showToast(t('toast.falseAlarm') || 'No worries! Session cancelled.');
}

function handleShare() {
  const count = document.getElementById('global-count').textContent;
  const shareText = t('share.text') || 'Right now {count} partners are on the throne. Mine is one of them. 🚽 notagain.one';
  share(shareText.replace('{count}', count), {
    copied: t('toast.copied'),
    failed: t('toast.copyFailed'),
  });
}

function handleDismiss() {
  state = 'idle';
  showState('idle');
}

// ─── Helpers ───────────────────────────────────────────────
function getTimeComment(seconds) {
  const min = Math.floor(seconds / 60);
  const comments = t('timeComments');
  // Fallback if translations not loaded yet
  if (!Array.isArray(comments)) return '';
  let comment = comments[0]?.text || '';
  for (const c of comments) {
    if (min >= c.min) comment = c.text;
  }
  return comment;
}

function getEndMessage(seconds) {
  const min = Math.floor(seconds / 60);
  const messages = t('endMessages');
  // Fallback if translations not loaded yet
  if (!Array.isArray(messages)) return '';
  for (const m of messages) {
    if (min < m.maxMin) return m.text;
  }
  return messages[messages.length - 1]?.text || '';
}

function rotateSubtext() {
  const el = document.getElementById('witty-subtext');
  if (!el || state !== 'idle') return;
  const subtexts = t('wittySubtexts');
  // Fallback if translations not loaded yet
  if (!Array.isArray(subtexts) || subtexts.length === 0) return;
  const count = document.getElementById('global-count')?.textContent || '0';
  el.textContent = subtexts[subtextIndex % subtexts.length].replace('{count}', count);
  subtextIndex = (subtextIndex + 1) % subtexts.length;
}

// ─── Boot ──────────────────────────────────────────────────
init();
