// 各面の「こたえ」（最少ループ数での各ループの動き）を求めて src/game/solutions.json に書く。
// 使い方: npx tsx scripts/make-solutions.ts   （面を足したら走らせて、audit も走らせる）
import { writeFileSync } from 'node:fs';
import { parse, solveWithPaths } from '../src/game/engine';
import { ALL_LEVELS } from '../src/game/levels';

const out: Record<string, number[][]> = {};
for (const lv of ALL_LEVELS) {
  const b = parse(lv);
  const t0 = Date.now();
  let sol: number[][] | null = null;
  for (const runs of [99, 2, 1]) {
    try {
      sol = solveWithPaths(b, lv.par, runs);
      if (sol) break;
    } catch {
      /* 次の絞り込みへ */
    }
  }
  console.log(lv.id, 'par', lv.par, sol ? `答え ${sol.length} ループ` : '答えなし', `${Date.now() - t0}ms`);
  if (sol) out[lv.id] = sol;
}
writeFileSync('src/game/solutions.json', JSON.stringify(out));
