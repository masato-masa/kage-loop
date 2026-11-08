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
  if (m) stopBgm();
  else startBgm();
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

// ---------------------------------------------------------------------------
// BGM: やわらかいアルペジオとパッドを合成して流す（ファイルなし）。最初のタップ後に始まり、ミュートで止まる。
const CHORDS: number[][] = [
  [57, 60, 64, 69], // Am
  [53, 57, 60, 65], // F
  [48, 52, 55, 60], // C
  [55, 59, 62, 67], // G
];
const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);
let bgmTimer: number | undefined;
let bgmGain: GainNode | null = null;
let nextT = 0;
let step = 0;

function bgmTick() {
  const c = ac();
  if (!c || !bgmGain) return;
  const BEAT = 60 / 66 / 2; // 8 分音符
  while (nextT < c.currentTime + 0.4) {
    const t = Math.max(nextT, c.currentTime + 0.02);
    const bar = Math.floor(step / 8) % CHORDS.length;
    const chord = CHORDS[bar];
    const pattern = [0, 2, 1, 3, 2, 1, 3, 2];
    const n = chord[pattern[step % 8]] + 12;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'triangle';
    o.frequency.value = midi(n);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.5, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + BEAT * 1.9);
    o.connect(g).connect(bgmGain);
    o.start(t);
    o.stop(t + BEAT * 2);
    if (step % 8 === 0) {
      // パッド（低い和音を小節の頭で鳴らす）
      for (const pn of [chord[0] - 12, chord[2] - 12]) {
        const po = c.createOscillator();
        const pg = c.createGain();
        po.type = 'sine';
        po.frequency.value = midi(pn);
        pg.gain.setValueAtTime(0.0001, t);
        pg.gain.exponentialRampToValueAtTime(0.35, t + 0.6);
        pg.gain.exponentialRampToValueAtTime(0.0001, t + BEAT * 7.8);
        po.connect(pg).connect(bgmGain);
        po.start(t);
        po.stop(t + BEAT * 8);
      }
    }
    nextT += BEAT;
    step++;
  }
}

export function startBgm() {
  if (muted || bgmTimer !== undefined) return;
  const c = ac();
  if (!c) return;
  bgmGain = c.createGain();
  bgmGain.gain.value = 0.045;
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 1800;
  bgmGain.connect(lp).connect(c.destination);
  nextT = c.currentTime + 0.1;
  step = 0;
  bgmTimer = window.setInterval(bgmTick, 120);
}

export function stopBgm() {
  if (bgmTimer !== undefined) window.clearInterval(bgmTimer);
  bgmTimer = undefined;
  try {
    bgmGain?.disconnect();
  } catch {
    /* 無視 */
  }
  bgmGain = null;
}
