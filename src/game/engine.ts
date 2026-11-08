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
export function nextMasks(b: Board, masks: number[]): Map<string, number[]> {
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
        nxt.set(`${q}|${s2.join(',')}`, { pos: q, sig: s2 });
      }
    }
    cur = nxt;
  }
  for (const { sig } of cur.values()) {
    const u = masks.map((m, t) => m | sig[t]);
    out.set(u.join(','), u);
  }
  return out;
}

export function solve(b: Board, maxLoops = 5): SolveResult {
  let level = new Map<string, number[]>([['', new Array<number>(b.T + 1).fill(0)]]);
  for (let loops = 1; loops <= maxLoops; loops++) {
    let ways = 0;
    for (const m of level.values()) if (canExit(b, m)) ways++;
    if (ways > 0) return { loops, ways };
    if (loops === maxLoops) break;
    const next = new Map<string, number[]>();
    for (const m of level.values()) for (const [k, v] of nextMasks(b, m)) next.set(k, v);
    level = next;
  }
  return { loops: null, ways: 0 };
}
