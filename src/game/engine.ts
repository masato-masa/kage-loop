// かげループの規則（純粋な TS。React・DOM を import しない）。
//
// - 1 ループ = T 手。毎手、上下左右に 1 マス動くか、その場で待つ。
// - T 手（または「ここでおわる」）で、動きが「かげ」として記録され、次のループで
//   同じ時刻に同じ道を歩く。かげは終わった場所に立ち続ける。
// - 床のスイッチ（a b c）に誰か（自分・かげ）が乗っている間だけ、同じ名前の扉（A B C）が開く。
// - 逆の扉（1 2 3 = スイッチ a b c と対）は、そのスイッチが空いている間だけ開く。
// - かげは自分にも他のかげにも当たらない（すり抜ける）。扉と壁は自分だけをふさぐ（かげは記録どおりに歩く）。
// - 出口（E）に着いたらクリア。使ったループ数が少ないほど星が多い。

export type Dir = 0 | 1 | 2 | 3 | 4; // 待つ・上・下・左・右
export const DX = [0, 0, 0, -1, 1];
export const DY = [0, -1, 1, 0, 0];

export interface Level {
  id: string;
  name: string;
  hint?: string;
  /** 1 ループの手数 */
  T: number;
  rows: string[];
  /** 最少ループ数（ソルバーで確かめた値。audit-levels が照合する） */
  par: number;
}

export interface Board {
  w: number;
  h: number;
  /** '#' 壁 / '.' 床 / 'a'.. スイッチ / 'A'.. 扉 / 'E' 出口（S は床にして start へ） */
  cells: string[];
  start: number;
  exit: number;
  T: number;
}

export function parse(level: Level): Board {
  const h = level.rows.length;
  const w = level.rows[0].length;
  const cells: string[] = [];
  let start = -1;
  let exit = -1;
  for (let y = 0; y < h; y++) {
    if (level.rows[y].length !== w) throw new Error(`${level.id}: 行の長さが違う (${y})`);
    for (let x = 0; x < w; x++) {
      const c = level.rows[y][x];
      const i = y * w + x;
      if (c === 'S') {
        start = i;
        cells.push('.');
      } else {
        if (c === 'E') exit = i;
        cells.push(c);
      }
    }
  }
  if (start < 0 || exit < 0) throw new Error(`${level.id}: S か E が無い`);
  return { w, h, cells, start, exit, T: level.T };
}

const isPlate = (c: string) => c >= 'a' && c <= 'c';
const isDoor = (c: string) => c >= 'A' && c <= 'C';
export const plateBit = (c: string): number => (isPlate(c) ? 1 << (c.charCodeAt(0) - 97) : 0);
const isInvDoor = (c: string) => c >= '1' && c <= '3';
export const isAnyDoor = (c: string) => isDoor(c) || isInvDoor(c);
export const plateBitAt = (b: Board, pos: number): number => plateBit(b.cells[pos]);
/** 扉 c が、スイッチの占有 occ のとき開いているか */
export function doorOpen(c: string, occ: number): boolean {
  if (isDoor(c)) return (occ & (1 << (c.charCodeAt(0) - 65))) !== 0;
  if (isInvDoor(c)) return (occ & (1 << (c.charCodeAt(0) - 49))) === 0;
  return true;
}

/** 動く先。壁・盤の外・閉じた扉なら null（手を使わない）。occ はそのとき誰かが踏んでいるスイッチの集合。 */
export function target(b: Board, pos: number, dir: Dir, occ: number): number | null {
  if (dir === 0) return pos;
  const x = (pos % b.w) + DX[dir];
  const y = Math.floor(pos / b.w) + DY[dir];
  if (x < 0 || y < 0 || x >= b.w || y >= b.h) return null;
  const to = y * b.w + x;
  const c = b.cells[to];
  if (c === '#') return null;
  if (!doorOpen(c, occ)) return null;
  return to;
}

/** かげ全員の「時刻 t にスイッチを踏んでいる集合」を重ねたもの。長さ T+1。 */
export function ghostMasks(b: Board, ghosts: number[][]): number[] {
  const m = new Array<number>(b.T + 1).fill(0);
  for (const g of ghosts) {
    for (let t = 0; t <= b.T; t++) m[t] |= plateBit(b.cells[g[Math.min(t, g.length - 1)]]);
  }
  return m;
}

/** 時刻 t に踏まれているスイッチ（かげ全員＋自分の足元） */
export const occAt = (b: Board, masks: number[], t: number, playerPos: number): number =>
  masks[t] | plateBitAt(b, playerPos);

/** かげの位置（時刻 t）。終わった道の後は最後の場所に立ち続ける。 */
export const ghostPos = (g: number[], t: number): number => g[Math.min(t, g.length - 1)];

// ---------------------------------------------------------------------------
// ソルバー: 最少ループ数と、その解の数（かげの組み合わせ）を数える。

export interface SolveResult {
  /** 最少ループ数（解けなければ null） */
  loops: number | null;
  /** 最少ループ数で解ける「かげの組み合わせ」の数（スイッチ占有の違いで数える） */
  ways: number;
}

/** かげの重なり masks のもとで、出口に着けるか */
export function canExit(b: Board, masks: number[]): boolean {
  let cur = new Set<number>([b.start]);
  for (let t = 0; t < b.T; t++) {
    const nxt = new Set<number>();
    for (const p of cur) {
      const occ = occAt(b, masks, t, p);
      for (let d = 0 as Dir; d <= 4; d++) {
        const q = target(b, p, d as Dir, occ);
        if (q === null) continue;
        if (q === b.exit) return true;
        nxt.add(q);
      }
    }
    cur = nxt;
  }
  return false;
}

/** 次に作れる「かげ」の、スイッチ占有の列（重なり）を全部挙げる。 */
export class TooBig extends Error {}

/** スイッチごとに「踏んでいる連続区間」が maxRuns 個を超えたか */
function tooManyRuns(sig: number[], maxRuns: number): boolean {
  for (let k = 0; k < 3; k++) {
    let runs = 0;
    let prev = 0;
    for (const v of sig) {
      const on = (v >> k) & 1;
      if (on && !prev) runs++;
      prev = on;
    }
    if (runs > maxRuns) return true;
  }
  return false;
}

export function nextMasks(b: Board, masks: number[], cap = 200000, maxRuns = 99): Map<string, number[]> {
  const out = new Map<string, number[]>();
  // 状態 = (位置, 時刻, 自分がこれまでに踏んだ列)。踏んだ列が同じなら同じ効果として畳む。
  let cur = new Map<string, { pos: number; sig: number[] }>();
  cur.set(`${b.start}|`, { pos: b.start, sig: [plateBitAt(b, b.start)] });
  for (let t = 0; t < b.T; t++) {
    const nxt = new Map<string, { pos: number; sig: number[] }>();
    for (const { pos, sig } of cur.values()) {
      const occ = occAt(b, masks, t, pos);
      for (let d = 0 as Dir; d <= 4; d++) {
        const q = target(b, pos, d as Dir, occ);
        if (q === null) continue;
        const s2 = sig.concat(plateBitAt(b, q));
        if (maxRuns < 99 && tooManyRuns(s2, maxRuns)) continue;
        nxt.set(`${q}|${s2.join(',')}`, { pos: q, sig: s2 });
      }
    }
    if (nxt.size > cap) throw new TooBig();
    cur = nxt;
  }
  for (const { sig } of cur.values()) {
    const u = masks.map((m, t) => m | sig[t]);
    out.set(u.join(','), u);
  }
  return out;
}

/**
 * 逆の扉が付いていないスイッチ（mono）は、踏まれる範囲が広いほど必ず有利。
 * 逆の扉のスイッチ（それ以外のビット）が同じ組み合わせの中で、mono の踏み方が他の下位互換になるものは捨てる。
 */
function prune(list: number[][], mono: number): number[][] {
  if (list.length < 2 || mono === 0) return list;
  const groups = new Map<string, number[][]>();
  for (const m of list) {
    const key = m.map((v) => v & ~mono).join(',');
    const g = groups.get(key);
    if (g) g.push(m);
    else groups.set(key, [m]);
  }
  const weight = (m: number[]) => m.reduce((a, v) => a + ((v & mono & 1) + ((v >> 1) & mono & 1) + ((v >> 2) & mono & 1)), 0);
  const out: number[][] = [];
  for (const g of groups.values()) {
    const sorted = g.map((m) => ({ m, w: weight(m) })).sort((x, y) => y.w - x.w);
    const kept: number[][] = [];
    for (const { m } of sorted) {
      let dominated = false;
      for (const k of kept) {
        let sub = true;
        for (let t = 0; t < m.length; t++) {
          if (((m[t] & mono) & k[t]) !== (m[t] & mono)) {
            sub = false;
            break;
          }
        }
        if (sub) {
          dominated = true;
          break;
        }
      }
      if (!dominated) kept.push(m);
    }
    out.push(...kept);
  }
  return out;
}

export function solve(b: Board, maxLoops = 5, cap = 60000, maxRuns = 99): SolveResult {
  // 逆の扉が付いているスイッチ以外は単調
  let mono = 7;
  for (const c of b.cells) if (c >= '1' && c <= '3') mono &= ~(1 << (c.charCodeAt(0) - 49));
  let level: number[][] = [new Array<number>(b.T + 1).fill(0)];
  for (let loops = 1; loops <= maxLoops; loops++) {
    let ways = 0;
    for (const m of level) if (canExit(b, m)) ways++;
    if (ways > 0) return { loops, ways };
    if (loops === maxLoops) break;
    let next = new Map<string, number[]>();
    for (const m of level) {
      for (const [k, v] of nextMasks(b, m, 200000, maxRuns)) next.set(k, v);
      if (next.size > cap) {
        // 途中でも下位互換を捨てて小さくする。それでも多すぎれば諦める。
        next = new Map(prune([...next.values()], mono).map((v) => [v.join(','), v]));
        if (next.size > cap / 2) throw new TooBig();
      }
    }
    level = prune([...next.values()], mono);
  }
  return { loops: null, ways: 0 };
}

export interface Verdict {
  /** 確定した最少ループ数（証明できなければ null） */
  par: number | null;
  /** 厳密に全探索できたか。false のときは下限（逆の扉を床にした緩い版）と上限（かげの立ち方を 1 回の連続に絞った探索）で挟んで証明した */
  exact: boolean;
  lower: number | null;
  upper: number | null;
}

/** 最少ループ数を確かめる。重い面は下限と上限で挟む。 */
export function verify(b: Board, maxLoops = 5): Verdict {
  try {
    const r = solve(b, maxLoops, 20000);
    return { par: r.loops, exact: true, lower: r.loops, upper: r.loops };
  } catch (e) {
    if (!(e instanceof TooBig)) throw e;
  }
  // 逆の扉を床にした緩い版（解が増えるだけなので、最少ループ数の下限になる）
  const relaxed: Board = { ...b, cells: b.cells.map((c) => (c >= '1' && c <= '3' ? '.' : c)) };
  const lower = solve(relaxed, maxLoops).loops;
  let upper: number | null = null;
  for (const runs of [1, 2]) {
    upper = solve(b, maxLoops, 60000, runs).loops;
    if (upper !== null) break;
  }
  return { par: lower !== null && lower === upper ? lower : null, exact: false, lower, upper };
}

// ---------------------------------------------------------------------------
// ヒント: 今のかげの状態から、次の 1 ループでどう動けばよいかを出す。

function exitPath(b: Board, masks: number[]): number[] | null {
  type St = { pos: number; path: number[] };
  let cur = new Map<number, St>([[b.start, { pos: b.start, path: [b.start] }]]);
  for (let t = 0; t < b.T; t++) {
    const nxt = new Map<number, St>();
    for (const { pos, path } of cur.values()) {
      const occ = occAt(b, masks, t, pos);
      for (let d = 0 as Dir; d <= 4; d++) {
        const q = target(b, pos, d as Dir, occ);
        if (q === null) continue;
        if (q === b.exit) return [...path, q];
        if (!nxt.has(q)) nxt.set(q, { pos: q, path: [...path, q] });
      }
    }
    cur = nxt;
  }
  return null;
}

function nextWithPaths(b: Board, masks: number[], maxRuns: number): Map<string, { u: number[]; path: number[] }> {
  const out = new Map<string, { u: number[]; path: number[] }>();
  let cur = new Map<string, { pos: number; sig: number[]; path: number[] }>();
  cur.set(`${b.start}|`, { pos: b.start, sig: [plateBitAt(b, b.start)], path: [b.start] });
  for (let t = 0; t < b.T; t++) {
    const nxt = new Map<string, { pos: number; sig: number[]; path: number[] }>();
    for (const { pos, sig, path } of cur.values()) {
      const occ = occAt(b, masks, t, pos);
      for (let d = 0 as Dir; d <= 4; d++) {
        const q = target(b, pos, d as Dir, occ);
        if (q === null) continue;
        const s2 = sig.concat(plateBitAt(b, q));
        if (maxRuns < 99 && tooManyRuns(s2, maxRuns)) continue;
        const key = `${q}|${s2.join(',')}`;
        if (!nxt.has(key)) nxt.set(key, { pos: q, sig: s2, path: [...path, q] });
      }
    }
    if (nxt.size > 200000) throw new TooBig();
    cur = nxt;
  }
  for (const { sig, path } of cur.values()) {
    const u = masks.map((m, t) => m | sig[t]);
    const key = u.join(',');
    if (!out.has(key)) out.set(key, { u, path });
  }
  return out;
}

export interface Hint {
  /** 今のループでの動き（位置の列）。null = この先は解けない（またはヒントを出せない） */
  path: number[] | null;
  /** 今のループが最後になるか（true なら出口まで行く道） */
  final: boolean;
  /** 今のかげの状態から、あと何ループで出口に着けるか */
  loopsLeft: number | null;
}

export function hintFrom(b: Board, ghosts: number[][], maxLoops = 4): Hint {
  const base = ghostMasks(b, ghosts);
  const direct = exitPath(b, base);
  if (direct) return { path: direct, final: true, loopsLeft: 1 };
  let mono = 7;
  for (const c of b.cells) if (c >= '1' && c <= '3') mono &= ~(1 << (c.charCodeAt(0) - 49));
  try {
    for (const runs of [99, 2, 1]) {
      let level = [...nextWithPaths(b, base, runs).values()].map((v) => ({ u: v.u, first: v.path }));
      for (let loops = 2; loops <= maxLoops; loops++) {
        for (const e of level) if (canExit(b, e.u)) return { path: e.first, final: false, loopsLeft: loops };
        if (loops === maxLoops) break;
        const next = new Map<string, { u: number[]; first: number[] }>();
        for (const e of level) {
          for (const [k, v] of nextMasks(b, e.u, 200000, runs)) if (!next.has(k)) next.set(k, { u: v, first: e.first });
          if (next.size > 60000) throw new TooBig();
        }
        const kept = prune([...next.values()].map((e) => e.u), mono);
        const keep = new Set(kept.map((u) => u.join(',')));
        level = [...next.entries()].filter(([k]) => keep.has(k)).map(([, e]) => e);
      }
    }
  } catch (e) {
    if (!(e instanceof TooBig)) throw e;
  }
  return { path: null, final: false, loopsLeft: null };
}

/** 最少ループ数での答え。各ループの動き（位置の列）を順に返す（最後が出口まで行く道）。重い面は null。 */
export function solveWithPaths(b: Board, maxLoops = 5, maxRuns = 99): number[][] | null {
  let mono = 7;
  for (const c of b.cells) if (c >= '1' && c <= '3') mono &= ~(1 << (c.charCodeAt(0) - 49));
  type E = { u: number[]; ghosts: number[][] };
  let level: E[] = [{ u: new Array<number>(b.T + 1).fill(0), ghosts: [] }];
  for (let loops = 1; loops <= maxLoops; loops++) {
    for (const e of level) {
      const p = exitPath(b, e.u);
      if (p) return [...e.ghosts, p];
    }
    if (loops === maxLoops) break;
    const next = new Map<string, E>();
    for (const e of level) {
      for (const [k, v] of nextWithPaths(b, e.u, maxRuns)) if (!next.has(k)) next.set(k, { u: v.u, ghosts: [...e.ghosts, v.path] });
      if (next.size > 60000) throw new TooBig();
    }
    const kept = prune([...next.values()].map((e) => e.u), mono);
    const keep = new Set(kept.map((u) => u.join(',')));
    level = [...next.entries()].filter(([k]) => keep.has(k)).map(([, e]) => e);
  }
  return null;
}
