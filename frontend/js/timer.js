let timerInterval = null;
let seconds = 0;
let callback = null;

export function startTimer(onTick) {
  seconds = 0;
  callback = onTick;
  timerInterval = setInterval(() => {
    seconds += 1;
    if (callback) callback(seconds);
  }, 1000);
}

export function stopTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
}

export function getSessionSeconds() {
  return seconds;
}

export function formatTimeLong(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m} min ${sec.toString().padStart(2, '0')} sec`;
}

export function formatTimeShort(s) {
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}
