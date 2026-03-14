import { t } from './i18n.js';

const REGION_INFO = {
  americas:     { name: 'Americas',      emoji: '🌎' },
  europe:       { name: 'Europe & Africa', emoji: '🌍' },
  asiaPacific:  { name: 'Asia-Pacific',  emoji: '🌏' },
};

const MEDALS = ['🥇', '🥈', '🥉'];

export function showState(state) {
  // Toggle state views
  for (const s of ['idle', 'active', 'ended']) {
    document.getElementById(`state-${s}`).classList.toggle('active', s === state);
    document.getElementById(`buttons-${s}`).classList.toggle('active', s === state);
  }

  // Witty subtext only visible in idle
  const subtext = document.getElementById('witty-subtext');
  if (subtext) subtext.style.display = state === 'idle' ? '' : 'none';
}

export function renderCounter(count) {
  const el = document.getElementById('global-count');
  if (el) el.textContent = count.toLocaleString();
}

export function animateBump() {
  const el = document.getElementById('global-count');
  if (!el) return;
  el.classList.add('bump');
  setTimeout(() => el.classList.remove('bump'), 200);
}

export function renderLeaderboard(regionCounts, userRegion) {
  const container = document.getElementById('leaderboard');
  if (!container) return;

  // Sort regions by count descending
  const sorted = Object.entries(regionCounts)
    .map(([key, count]) => ({
      key,
      count,
      ...REGION_INFO[key],
    }))
    .sort((a, b) => b.count - a.count);

  container.innerHTML = sorted
    .map((r, i) => {
      const isYou = r.key === userRegion;
      return `
        <div class="leaderboard-row${isYou ? ' is-you' : ''}">
          <div class="leaderboard-left">
            <span class="leaderboard-medal">${MEDALS[i] || ''}</span>
            <span class="leaderboard-emoji">${r.emoji}</span>
            <span class="leaderboard-name">
              ${r.name}${isYou ? `<span class="leaderboard-you">${t('leaderboard.you') || 'you'}</span>` : ''}
            </span>
          </div>
          <span class="leaderboard-count">${r.count.toLocaleString()}</span>
        </div>`;
    })
    .join('');
}

export function renderStats(stats) {
  const { visitCount, longestSession, totalDuration, currentStreak } = stats;

  document.getElementById('stat-sessions').textContent = visitCount;
  document.getElementById('stat-longest').textContent =
    longestSession >= 1 ? formatDuration(Math.round(longestSession)) : '\u2014';
  document.getElementById('stat-average').textContent =
    visitCount > 0 ? formatDuration(Math.round(totalDuration / visitCount)) : '\u2014';
  document.getElementById('stat-streak').textContent = `${currentStreak} 🔥`;
}

function formatDuration(seconds) {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

let toastTimeout = null;

export function showToast(message) {
  const toast = document.getElementById('share-toast');
  if (!toast) return;

  toast.textContent = message;
  toast.classList.remove('hidden');

  // Reset animation
  toast.style.animation = 'none';
  toast.offsetHeight; // force reflow
  toast.style.animation = '';

  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.add('hidden'), 2500);
}
