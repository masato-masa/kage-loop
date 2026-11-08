// 効果音は WebAudio で合成する（ファイルを持たない）。URL に ?mute を付けると鳴らさない。
let ctx: AudioContext | null = null;
let muted = false;
try {
  muted = new URLSearchParams(location.search).has('mute') || localStorage.getItem('kage-mute') === '1';
} catch {
  /* 保存領域が使えない環境 */
}

export const isMuted = () => muted;
export function setMuted(m: boolean) {
  muted = m;
  try {
    localStorage.setItem('kage-mute', m ? '1' : '0');
  } catch {
    /* 無視 */
  }
}

function ac(): AudioContext | null {
  if (muted) return null;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, dur: number, type: OscillatorType, vol: number, at = 0, slide = 0) {
  const c = ac();
  if (!c) return;
  const t0 = c.currentTime + at;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(c.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

const buzz = (ms: number) => {
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* 無視 */
  }
};

export const sfx = {
  step: () => tone(520 + Math.random() * 40, 0.07, 'triangle', 0.08),
  blocked: () => {
    tone(140, 0.12, 'sawtooth', 0.07);
    buzz(25);
  },
  plateOn: () => {
    tone(660, 0.1, 'sine', 0.09);
    tone(880, 0.12, 'sine', 0.07, 0.07);
  },
  doorOpen: () => tone(300, 0.22, 'square', 0.05, 0, 400),
  doorClose: () => tone(520, 0.22, 'square', 0.05, 0, -300),
  record: () => {
    tone(880, 0.35, 'sine', 0.08, 0, -600);
    tone(660, 0.35, 'triangle', 0.05, 0.05, -400);
    buzz(40);
  },
  win: () => {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.28, 'triangle', 0.1, i * 0.1));
    buzz(80);
  },
  undo: () => tone(400, 0.08, 'sine', 0.06, 0, -120),
};
