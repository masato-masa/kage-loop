import { describe, expect, it } from 'vitest';

import { canExit, ghostMasks, parse, solve, verify } from '../game/engine';
import { ALL_LEVELS } from '../game/levels';
import { backLoop, commit, endLoop, newPlay, step, undo } from '../game/play';
import solutions from '../game/solutions.json';

const lv = (rows: string[], T = 8) => parse({ id: 't', name: 't', T, par: 0, rows });

describe('ルール', () => {
  it('かげがスイッチを踏むと扉が開き、踏んでいなければ閉じている', () => {
    const b = lv(['#######', '#S.a###', '#.#####', '#.#####', '#A#####', '#E#####', '#######']);
    // 何もしないかげ: 扉は閉まったまま
    expect(canExit(b, new Array(b.T + 1).fill(0))).toBe(false);
    // スイッチに立つかげ
    let p = newPlay(b);
    for (const d of [4, 4] as const) {
      const r = step(b, p, d);
      expect(r.kind).toBe('ok');
      if (r.kind === 'ok') p = r.play;
    }
    p = endLoop(p);
    expect(p.ghosts.length).toBe(1);
    expect(canExit(b, ghostMasks(b, p.ghosts))).toBe(true);
  });

  it('閉じた扉・壁には進めず、手を使わない', () => {
    const b = lv(['#####', '#SA.#', '#..E#', '#####']);
    const p = newPlay(b);
    const r = step(b, p, 4);
    expect(r.kind).toBe('blocked');
    if (r.kind === 'blocked') expect(r.reason).toBe('door');
    const w = step(b, p, 3);
    expect(w.kind === 'blocked' && w.reason === 'wall').toBe(true);
  });

  it('T 手でループが終わり、かげになる', () => {
    const b = lv(['#######', '#S...E#', '#######'], 3);
    let p = newPlay(b);
    let committed = false;
    for (let i = 0; i < 3; i++) {
      const r = step(b, p, 0);
      if (r.kind === 'ok') {
        p = r.play;
        committed = r.committed;
      }
    }
    expect(committed).toBe(true);
    expect(p.loops).toBe(2);
    expect(p.ghosts).toHaveLength(1);
    expect(p.cur).toEqual([b.start]);
  });

  it('出口に着けば勝ち、undo と backLoop が効く', () => {
    const b = lv(['#####', '#SE##', '#####']);
    const r = step(b, newPlay(b), 4);
    expect(r.kind === 'ok' && r.play.won).toBe(true);
    const b2 = lv(['########', '#S...E##', '########']);
    let p = newPlay(b2);
    p = (step(b2, p, 4) as { play: typeof p }).play;
    expect(undo(p).cur).toHaveLength(1);
    p = commit(p);
    expect(p.loops).toBe(2);
    expect(backLoop(p).cur).toHaveLength(2);
  });

  it('逆の扉は、スイッチが空いている間だけ開く', () => {
    const b = lv(['#########', '#S.A.1.E#', '##a######'], 8);
    const none = new Array(b.T + 1).fill(0);
    expect(canExit(b, none)).toBe(false); // A が閉じている
    expect(solve(b, 3).loops).toBe(2);
  });
});

describe('全面の検証', () => {
  it('どの面も par のループ数で解け、par - 1 では解けない（全探索、または下限と上限で証明）', () => {
    for (const level of ALL_LEVELS) {
      const v = verify(parse(level), 5, level.witness);
      expect(v.par, `${level.id}: 下限${v.lower} 上限${v.upper}`).toBe(level.par);
    }
  }, 300_000);
});

describe('こたえ（solutions.json）', () => {
  it('どの面の答えも、実際の操作で再生して出口に着く', () => {
    const sols = solutions as Record<string, number[][]>;
    for (const level of ALL_LEVELS) {
      const sol = sols[level.id];
      expect(sol, `${level.id} の答えが無い（npx tsx scripts/make-solutions.ts）`).toBeTruthy();
      expect(sol.length, level.id).toBe(level.par);
      const b = parse(level);
      let p = newPlay(b);
      sol.forEach((path, li) => {
        for (let t = 1; t < path.length; t++) {
          const dx = (path[t] % b.w) - (path[t - 1] % b.w);
          const dy = Math.floor(path[t] / b.w) - Math.floor(path[t - 1] / b.w);
          const d = dx === 0 && dy === 0 ? 0 : dx === 1 ? 4 : dx === -1 ? 3 : dy === 1 ? 2 : 1;
          const r = step(b, p, d as 0 | 1 | 2 | 3 | 4);
          expect(r.kind, `${level.id} ループ${li + 1} の ${t} 手目`).toBe('ok');
          if (r.kind === 'ok') p = r.play;
        }
        if (li < sol.length - 1) p = endLoop(p);
      });
      expect(p.won, `${level.id} が答えで解けない`).toBe(true);
    }
  }, 60_000);
});
