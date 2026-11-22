// 手で描いた盤の評価。使い方: npx tsx scripts/eval-board.ts <T> <行1> <行2> ...
// 最少ループ数と、各部品（扉・スイッチ・ワープ）が本当に必要かを表示する。
import { parse, solve, TooBig, type Level } from '../src/game/engine';

const [T, ...rows] = process.argv.slice(2);
const lv = (r: string[]): Level => ({ id: 'g', name: 'g', T: Number(T), par: 0, rows: r });
const loops = (r: string[]): number | null | 'big' => {
  try {
    return solve(parse(lv(r)), 8, 20000).loops;
  } catch (e) {
    if (e instanceof TooBig) return 'big';
    throw e;
  }
};
const base = loops(rows);
console.log(`par ${base}`);
const H = rows.length, W = rows[0]!.length;
for (let y = 0; y < H; y++)
  for (let x = 0; x < W; x++) {
    const c = rows[y]![x]!;
    if (!/[abcABC123w]/.test(c)) continue;
    const r2 = c === 'w' ? rows.map((r) => r.replace(/w/g, '.')) : rows.map((r, yy) => (yy === y ? r.slice(0, x) + '.' + r.slice(x + 1) : r));
    console.log(`  ${c} (${x},${y}) を外すと → ${loops(r2)}`);
  }
