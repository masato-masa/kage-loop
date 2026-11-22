// 既存の par 4 の盤を 1〜2 か所いじって、新しい par 4 の盤を探す。使い方:
//   npx tsx scripts/mutate-levels.ts <秒> [シード]
// 条件は gen-levels.ts と同じ（最少ループ数 = 4、無駄な扉・スイッチが無い）。
import { parse, solve, TooBig, type Level } from '../src/game/engine';
import { WORLDS } from '../src/game/levels';

const SEC = Number(process.argv[2] ?? 120);
let s = Number(process.argv[3] ?? 1) >>> 0 || 1;
const rnd = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
const GOAL = 4;
const seeds = WORLDS.flatMap((w) => w.levels).filter((l) => l.par === GOAL);
const have = new Set(WORLDS.flatMap((w) => w.levels).map((l) => l.rows.join('/')));
const lv = (rows: string[], T: number): Level => ({ id: 'g', name: 'g', T, par: 0, rows });
const loops = (rows: string[], T: number): number | null => {
  try {
    return solve(parse(lv(rows, T)), GOAL + 1, 6000).loops;
  } catch (e) {
    if (e instanceof TooBig) return -1;
    throw e;
  }
};
const t0 = Date.now();
const found = new Set<string>();
let tried = 0;
while (Date.now() - t0 < SEC * 1000) {
  const base = seeds[Math.floor(rnd() * seeds.length)]!;
  const g = base.rows.map((r) => r.split(''));
  const H = g.length, W = g[0]!.length;
  const nm = 1 + Math.floor(rnd() * 2);
  for (let k = 0; k < nm; k++) {
    const x = 1 + Math.floor(rnd() * (W - 2)), y = 1 + Math.floor(rnd() * (H - 2));
    const op = Math.floor(rnd() * 3);
    const c = g[y]![x]!;
    if (c === 'S' || c === 'E') continue;
    if (op === 0) g[y]![x] = c === '#' ? '.' : '#'; // 壁と床を入れ替える
    else if (op === 1 && c !== '#') {
      // 部品を隣へ動かす
      const d = [[1, 0], [-1, 0], [0, 1], [0, -1]][Math.floor(rnd() * 4)]!;
      const nx = x + d[0]!, ny = y + d[1]!;
      if (ny > 0 && ny < H - 1 && nx > 0 && nx < W - 1 && g[ny]![nx] === '.' && c !== '.') {
        g[ny]![nx] = c;
        g[y]![x] = '.';
      }
    } else if (op === 2) g[y]![x] = '.';
  }
  const rows = g.map((r) => r.join(''));
  const key = rows.join('/');
  if (have.has(key) || found.has(key)) continue;
  tried++;
  const base4 = loops(rows, base.T);
  if (base4 !== GOAL) continue;
  let ok = true;
  for (let y = 0; y < H && ok; y++)
    for (let x = 0; x < W && ok; x++) {
      const c = rows[y]![x]!;
      const isDoor = /[ABC123]/.test(c);
      const isPlate = /[abc]/.test(c);
      if (!isDoor && !isPlate) continue;
      const r2 = rows.map((r, yy) => (yy === y ? r.slice(0, x) + '.' + r.slice(x + 1) : r));
      const l2 = loops(r2, base.T);
      if (l2 === -1) { ok = false; continue; }
      if (isDoor && !(l2 !== null && l2 < GOAL)) ok = false;
      if (isPlate && !(l2 === null || l2 > GOAL)) ok = false;
    }
  if (!ok) continue;
  found.add(key);
  console.log(`// 元 ${base.id} T=${base.T}\n${rows.map((r) => `        '${r}',`).join('\n')}`);
}
console.log(`${tried} 盤を調べた、${found.size} 件`);
