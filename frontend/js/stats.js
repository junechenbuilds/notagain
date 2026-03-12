const STORAGE_KEY = 'notagain_stats';

function getDefaults() {
  return {
    visitCount: 0,
    totalDuration: 0,
    longestSession: 0,
    sessions: [],
    currentStreak: 0,
    lang: 'en',
    soundOn: false,
    achievements: [],
    firstVisit: new Date().toISOString().split('T')[0],
  };
}

export function loadStats() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaults();
    return { ...getDefaults(), ...JSON.parse(raw) };
  } catch {
    return getDefaults();
  }
}

export function getStats() {
  return loadStats();
}

export function saveStats(stats) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  } catch {
    // LocalStorage full or unavailable — silent fail
  }
}

export function saveSession(durationSeconds) {
  const stats = loadStats();
  const today = new Date().toISOString().split('T')[0];

  stats.visitCount += 1;
  stats.totalDuration += durationSeconds;
  stats.longestSession = Math.max(stats.longestSession, durationSeconds);

  stats.sessions.push({ date: today, duration: durationSeconds });
  if (stats.sessions.length > 50) {
    stats.sessions = stats.sessions.slice(-50);
  }

  stats.currentStreak = calculateStreak(stats.sessions);
  saveStats(stats);
}

function calculateStreak(sessions) {
  if (sessions.length === 0) return 0;

  const dates = [...new Set(sessions.map((s) => s.date))].sort().reverse();
  let streak = 0;
  const checkDate = new Date();

  for (const dateStr of dates) {
    const expected = checkDate.toISOString().split('T')[0];
    if (dateStr === expected) {
      streak += 1;
      checkDate.setDate(checkDate.getDate() - 1);
    } else if (streak === 0) {
      // Allow starting from yesterday
      checkDate.setDate(checkDate.getDate() - 1);
      const yesterday = checkDate.toISOString().split('T')[0];
      if (dateStr === yesterday) {
        streak += 1;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    } else {
      break;
    }
  }

  return streak;
}

export function saveLangPreference(lang) {
  const stats = loadStats();
  stats.lang = lang;
  saveStats(stats);
}

export function saveSoundPreference(soundOn) {
  const stats = loadStats();
  stats.soundOn = soundOn;
  saveStats(stats);
}
