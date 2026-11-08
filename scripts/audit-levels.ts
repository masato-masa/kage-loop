// 全面をソルバーで解いて、par（最少ループ数）と一致するか確かめる。
// 使い方: npx tsx scripts/audit-levels.ts
import { parse, verify } from '../src/game/engine';
import { ALL_LEVELS } from '../src/game/levels';

let bad = 0;
for (const lv of ALL_LEVELS) {
  const t0 = Date.now();
  const b = parse(lv);
  const r = verify(b, 5, lv.witness);
  const ok = r.par === lv.par;
  if (!ok) bad++;
  console.log(
    `${ok ? 'OK ' : 'NG '} ${lv.id.padEnd(5)} ${lv.name.padEnd(10)} T=${String(lv.T).padStart(2)} par=${lv.par} 実測=${r.par ?? '未確定'} ${r.exact ? '全探索' : `下限${r.lower}・上限${r.upper}`} (${Date.now() - t0}ms)`,
  );
}
if (bad) {
  console.error(`${bad} 面が par と合いません`);
  process.exit(1);
}
console.log(`${ALL_LEVELS.length} 面すべて一致`);
