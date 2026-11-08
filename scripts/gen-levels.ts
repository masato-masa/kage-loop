// 条件を満たす面を探す。使い方:
//   npx tsx scripts/gen-levels.ts <幅> <高さ> <T> <目標ループ数> <秒> [逆の扉の数]
// 条件: (1) 最少ループ数 = 目標  (2) 扉を 1 枚ずつ床にすると、どれも最少ループ数が減る（無駄な扉が無い）
//       (3) スイッチを 1 つずつ床にすると、どれも解けなくなるか最少ループ数が増える。
import { parse, solve, TooBig, type Level } from '../src/game/engine';

const [W, H, T, GOAL, SEC, INV = '0'] = process.argv.slice(2).map(Number);
let seed = Date.now() % 100000;
const rnd = () => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 4294967296;
};
const pick = <X,>(a: X[]) => a[Math.floor(rnd() * a.length)];

function make(): string[][] {
  const g: string[][] = [];
  for (let y = 0; y < H; y++) {
    const r: string[] = [];
    for (let x = 0; x < W; x++) r.push(x === 0 || y === 0 || x === W - 1 || y === H - 1 || rnd() < 0.3 ? '#' : '.');
    g.push(r);
  }
  const free = () => {
    const f: [number, number][] = [];
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) if (g[y][x] === '.') f.push([x, y]);
    return f;
  };
  const put = (c: string) => {
    const f = free();
    if (!f.length) return false;
    const [x, y] = pick(f);
    g[y][x] = c;
    return true;
  };
  // S は左、E は右に寄せる
  const left = free().filter(([x]) => x <= 2);
  const right = free().filter(([x]) => x >= W - 3);
  if (!left.length || !right.length) return g;
  const [sx, sy] = pick(left);
  g[sy][sx] = 'S';
  const [ex, ey] = pick(right);
  g[ey][ex] = 'E';
  const nInv = INV;
  put('a');
  put('b');
  put('A');
  put('B');
  for (let i = 0; i < nInv; i++) put(String(i + 1));
  return g;
}

const lv = (rows: string[]): Level => ({ id: 'g', name: 'g', T, par: 0, rows });
const loopsOf = (rows: string[]): number | null => solve(parse(lv(rows)), GOAL + 1, 6000).loops;

const t0 = Date.now();
let tried = 0;
const seen = new Set<string>();
while (Date.now() - t0 < SEC * 1000) {
  tried++;
  const g = make();
  const rows = g.map((r) => r.join(''));
  const key = rows.join('/');
  if (seen.has(key)) continue;
  seen.add(key);
  let b;
  try {
    b = parse(lv(rows));
  } catch {
    continue;
  }
  let base: number | null;
  try {
    base = solve(b, GOAL + 1, 6000).loops;
  } catch (e) {
    if (e instanceof TooBig) continue;
    throw e;
  }
  if (base !== GOAL) continue;
  // 無駄な扉・スイッチが無いか
  let ok = true;
  for (let y = 0; y < H && ok; y++)
    for (let x = 0; x < W && ok; x++) {
      const c = rows[y][x];
      const isDoor = /[ABC123]/.test(c);
      const isPlate = /[abc]/.test(c);
      if (!isDoor && !isPlate) continue;
      const r2 = rows.map((r, yy) => (yy === y ? r.slice(0, x) + '.' + r.slice(x + 1) : r));
      let l2: number | null;
      try {
        l2 = loopsOf(r2);
      } catch {
        ok = false;
        continue;
      }
      if (isDoor && !(l2 !== null && l2 < GOAL)) ok = false;
      if (isPlate && !(l2 === null || l2 > GOAL)) ok = false;
    }
  if (!ok) continue;
  console.log(`\n// T=${T} par=${GOAL} (${tried} 試行)`);
  console.log(rows.map((r) => `        '${r}',`).join('\n'));
}
console.log(`\n${tried} 盤を調べた`);
