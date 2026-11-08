import type { Level } from './engine';

// '#' 壁 / '.' 床 / S 入口 / E 出口 / a b c スイッチ / A B C 扉 / 1 2 3 逆の扉（a b c が空いている間だけ開く）
// par は scripts/audit-levels.ts が測った最少ループ数。ずれたら audit が落ちる。
export const WORLDS: { name: string; levels: Level[] }[] = [
  {
    name: 'はじめのかげ',
    levels: [
      {
        id: '1-1',
        name: 'かげに まかせる',
        hint: '自分の動きが、次のループで「かげ」になる。かげはスイッチを踏み続ける。',
        T: 6,
        par: 2,
        rows: ['#######', '#S.a###', '#.#####', '#.#####', '#A#####', '#E#####', '#######'],
      },
      {
        id: '1-2',
        name: 'まわりみち',
        T: 8,
        par: 2,
        rows: ['#######', '#a#...#', '#.#.#E#', '#S.A..#', '#######'],
      },
      {
        id: '1-3',
        name: 'ふたつの とびら',
        T: 9,
        par: 3,
        rows: ['###########', '#a#b#######', '#.#.#######', '#S..A..B.E#', '###########'],
      },
    ],
  },
];

export const ALL_LEVELS: Level[] = WORLDS.flatMap((w) => w.levels);
