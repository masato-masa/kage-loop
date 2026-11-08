// 遊んでいる最中の状態と、その遷移（純粋な関数）。
import { type Board, type Dir, ghostMasks, occAt, plateBitAt, target } from './engine';

export interface Play {
  /** 記録済みのかげ（各ループの位置の列。index = 時刻） */
  ghosts: number[][];
  /** 今のループの自分の位置の列（cur[0] = 入口） */
  cur: number[];
  won: boolean;
  /** これまでに使ったループ数（クリアしたループを含む） */
  loops: number;
}

export const newPlay = (b: Board): Play => ({ ghosts: [], cur: [b.start], won: false, loops: 1 });

export type StepResult =
  | { kind: 'ok'; play: Play; committed: boolean }
  | { kind: 'blocked'; reason: 'wall' | 'door' };

/** 現在の時刻（このループで使った手数） */
export const timeOf = (p: Play): number => p.cur.length - 1;

/** いまの自分の足元で踏まれているスイッチ（かげ＋自分） */
export function occNow(b: Board, p: Play): number {
  return occAt(b, ghostMasks(b, p.ghosts), Math.min(timeOf(p), b.T), p.cur[p.cur.length - 1]);
}

export function step(b: Board, p: Play, dir: Dir): StepResult {
  if (p.won) return { kind: 'blocked', reason: 'wall' };
  const t = timeOf(p);
  const pos = p.cur[t];
  const masks = ghostMasks(b, p.ghosts);
  const occ = occAt(b, masks, t, pos);
  const to = target(b, pos, dir, occ);
  if (to === null) {
    // 閉じた扉か壁か（見た目を分けるため）
    const x = (pos % b.w) + [0, 0, 0, -1, 1][dir];
    const y = Math.floor(pos / b.w) + [0, -1, 1, 0, 0][dir];
    const inside = x >= 0 && y >= 0 && x < b.w && y < b.h;
    const c = inside ? b.cells[y * b.w + x] : '#';
    return { kind: 'blocked', reason: c === '#' || !inside ? 'wall' : 'door' };
  }
  const cur = [...p.cur, to];
  if (to === b.exit) return { kind: 'ok', play: { ...p, cur, won: true }, committed: false };
  if (cur.length - 1 >= b.T) return { kind: 'ok', play: commit({ ...p, cur }), committed: true };
  return { kind: 'ok', play: { ...p, cur }, committed: false };
}

/** このループを「かげ」にして、次のループを始める */
export function commit(p: Play): Play {
  return { ...p, ghosts: [...p.ghosts, p.cur], cur: [p.cur[0]], loops: p.loops + 1 };
}

export const endLoop = (p: Play): Play => (p.won || p.cur.length <= 1 ? p : commit(p));

export const undo = (p: Play): Play => (p.cur.length > 1 && !p.won ? { ...p, cur: p.cur.slice(0, -1) } : p);

export const resetLoop = (p: Play): Play => (p.won ? p : { ...p, cur: [p.cur[0]] });

/** 直前のループを取り消して、そのかげを自分の動きに戻す */
export function backLoop(p: Play): Play {
  if (p.won || !p.ghosts.length) return p;
  const last = p.ghosts[p.ghosts.length - 1];
  return { ...p, ghosts: p.ghosts.slice(0, -1), cur: last, loops: p.loops - 1 };
}

/** かげ（番号 i）の時刻 t の位置 */
export const ghostAt = (g: number[], t: number): number => g[Math.min(t, g.length - 1)];

/** 自分の足元にスイッチがあるか（見た目用） */
export const onPlate = (b: Board, p: Play): number => plateBitAt(b, p.cur[p.cur.length - 1]);

/** 星の数: par 以内 3 / par+1 で 2 / それ以外 1 */
export const starsFor = (loops: number, par: number): 1 | 2 | 3 => (loops <= par ? 3 : loops <= par + 1 ? 2 : 1);
