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
    localStorage.removeItem('kage-loop:last:v1');
    localStorage.removeItem('kage-loop:seen:v1');
  } catch {
    /* 無視 */
  }
}

// 最後に遊んだ面と、説明を見たかどうか
const LAST = 'kage-loop:last:v1';
const SEEN = 'kage-loop:seen:v1';

export function loadLast(): string | null {
  try {
    return localStorage.getItem(LAST);
  } catch {
    return null;
  }
}

export function saveLast(id: string) {
  try {
    localStorage.setItem(LAST, id);
  } catch {
    /* 無視 */
  }
}

export function hasSeen(k: string): boolean {
  try {
    return (localStorage.getItem(SEEN) ?? '').split(',').includes(k);
  } catch {
    return false;
  }
}

export function markSeen(k: string) {
  try {
    const cur = (localStorage.getItem(SEEN) ?? '').split(',').filter(Boolean);
    if (!cur.includes(k)) localStorage.setItem(SEEN, [...cur, k].join(','));
  } catch {
    /* 無視 */
  }
}
