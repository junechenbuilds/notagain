import { loadStats, saveSoundPreference } from './stats.js';

let soundOn = false;
let audioCtx = null;

export function initSound() {
  const stats = loadStats();
  soundOn = stats.soundOn || false;
  updateSoundIcon();
}

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

/**
 * Synthesize a toilet flush sound using Web Audio API.
 * Combines filtered noise (water rush) with a low-frequency sweep (drain).
 */
export function playFlush() {
  if (!soundOn) return;

  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') ctx.resume();

    const now = ctx.currentTime;
    const duration = 1.6;

    // --- White noise source (water rush) ---
    const bufferSize = ctx.sampleRate * duration;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1);
    }

    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    // Band-pass filter to shape water sound
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, now);
    filter.frequency.exponentialRampToValueAtTime(200, now + duration);
    filter.Q.value = 0.5;

    // Envelope for the noise
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0, now);
    noiseGain.gain.linearRampToValueAtTime(0.3, now + 0.1);
    noiseGain.gain.setValueAtTime(0.3, now + 0.4);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + duration);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    // --- Low oscillator (drain gurgle) ---
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + duration);

    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(0, now);
    oscGain.gain.linearRampToValueAtTime(0.15, now + 0.2);
    oscGain.gain.setValueAtTime(0.15, now + 0.5);
    oscGain.gain.exponentialRampToValueAtTime(0.01, now + duration);

    osc.connect(oscGain);
    oscGain.connect(ctx.destination);

    // Start and stop
    noise.start(now);
    noise.stop(now + duration);
    osc.start(now);
    osc.stop(now + duration);
  } catch {
    // Audio not supported — silent fail
  }
}

export function toggleSound() {
  soundOn = !soundOn;
  saveSoundPreference(soundOn);
  updateSoundIcon();

  // Play a quick sound on toggle-on so user knows it's working
  if (soundOn) playFlush();
}

function updateSoundIcon() {
  const btn = document.getElementById('sound-toggle');
  if (btn) btn.textContent = soundOn ? '🔊' : '🔇';
}

export function isSoundOn() {
  return soundOn;
}
