// クリア記録（面 id → 最高の星）。保存できなくても遊べる。
const KEY = 'kage-loop:stars:v1';

export type Stars = Record<string, 1 | 2 | 3>;

export function loadStars(): Stars {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Stars) : {};
  } catch {
    return {};
  }
}

export function saveStar(id: string, stars: 1 | 2 | 3): Stars {
  const all = loadStars();
  if ((all[id] ?? 0) < stars) all[id] = stars;
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* 無視 */
  }
  return all;
}

export function clearStars() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* 無視 */
  }
}
