// 全面をソルバーで解いて、par（最少ループ数）と一致するか確かめる。
// 使い方: npx tsx scripts/audit-levels.ts
import { parse, solve } from '../src/game/engine';
import { ALL_LEVELS } from '../src/game/levels';

let bad = 0;
for (const lv of ALL_LEVELS) {
  const t0 = Date.now();
  const b = parse(lv);
  const r = solve(b, 5);
  const ok = r.loops === lv.par;
  if (!ok) bad++;
  console.log(
    `${ok ? 'OK ' : 'NG '} ${lv.id.padEnd(5)} ${lv.name.padEnd(10)} T=${String(lv.T).padStart(2)} par=${lv.par} 実測=${r.loops ?? '解なし'} 解の数=${r.ways} (${Date.now() - t0}ms)`,
  );
}
if (bad) {
  console.error(`${bad} 面が par と合いません`);
  process.exit(1);
}
console.log(`${ALL_LEVELS.length} 面すべて一致`);
