/**
 * Sound effects, synthesised rather than shipped.
 *
 * A comic needs BOOM and POW, but binary assets are a nuisance to keep, load
 * and licence. Web Audio makes these for nothing, and they're punchy enough
 * for the job. Muteable in one tap, and the preference sticks.
 */

let ctx: AudioContext | null = null;
let muted = false;

export function isMuted(): boolean {
  return muted;
}

export function setMuted(value: boolean): void {
  muted = value;
  try {
    window.localStorage.setItem('coderx.muted', value ? '1' : '0');
  } catch {
    /* ignore */
  }
}

export function loadMutePreference(): boolean {
  try {
    muted = window.localStorage.getItem('coderx.muted') === '1';
  } catch {
    muted = false;
  }
  return muted;
}

function tone(freq: number, ms: number, type: OscillatorType = 'square', gain = 0.05, delay = 0) {
  if (muted || typeof window === 'undefined') return;
  try {
    ctx ??= new (window.AudioContext || (window as never as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const vol = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    vol.gain.setValueAtTime(gain, t0);
    vol.gain.exponentialRampToValueAtTime(0.0001, t0 + ms / 1000);
    osc.connect(vol).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + ms / 1000);
  } catch {
    /* Audio is a nice-to-have; never let it break the game. */
  }
}

export const sfx = {
  tap: () => tone(520, 60, 'square', 0.035),
  place: () => tone(660, 80, 'triangle', 0.05),
  step: () => tone(320, 50, 'sine', 0.03),
  grab: () => {
    tone(700, 60, 'triangle', 0.05);
    tone(950, 70, 'triangle', 0.04, 0.06);
  },
  bin: () => {
    tone(400, 70, 'square', 0.05);
    tone(300, 120, 'square', 0.05, 0.07);
  },
  win: () => {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, 160, 'triangle', 0.06, i * 0.09));
  },
  oops: () => {
    tone(200, 130, 'sawtooth', 0.045);
    tone(150, 200, 'sawtooth', 0.045, 0.11);
  },
  reward: () => {
    [659, 784, 988, 1319].forEach((f, i) => tone(f, 200, 'triangle', 0.055, i * 0.11));
  },
};
