import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { type Dir, parse } from './game/engine';
import { ALL_LEVELS, WORLDS } from './game/levels';
import { backLoop, endLoop, newPlay, type Play, resetLoop, starsFor, step, timeOf, undo } from './game/play';
import { ghostMasks, plateBit } from './game/engine';
import { IMG } from './ui/assets';
import solutions from './game/solutions.json';
import { BoardView } from './ui/Board';
import { isMuted, setMuted, sfx, startBgm, stopBgm } from './ui/sound';
import { clearStars, hasSeen, loadLast, loadStars, markSeen, saveLast, saveStar, type Stars } from './ui/storage';

const QS = new URLSearchParams(location.search);
/** 確認用: ?all で全面を開く、?lv=2-1 でその面から始める */
const UNLOCK_ALL = QS.has('all');

type Screen = { name: 'home' } | { name: 'play'; idx: number };

const Star = ({ on }: { on: boolean }) => <span className={`star${on ? ' on' : ''}`}>★</span>;

function Home({ stars, onPlay }: { stars: Stars; onPlay: (i: number) => void }) {
  const total = ALL_LEVELS.length;
  const got = Object.values(stars).reduce((a, s) => a + s, 0);
  // 次にやる面 = まだ星の無い最初の面（全部終わっていたら最後に遊んだ面）
  const nextIdx = (() => {
    const i = ALL_LEVELS.findIndex((l) => !stars[l.id]);
    if (i >= 0) return i;
    const j = ALL_LEVELS.findIndex((l) => l.id === loadLast());
    return j >= 0 ? j : 0;
  })();
  const next = ALL_LEVELS[nextIdx];
  const started = Object.keys(stars).length > 0;
  // 全面クリア済みのワールドは、見出しだけにたたむ（タップで開く）
  const [fold, setFold] = useState<Record<string, boolean>>({});
  const isFolded = (name: string, ls: { id: string }[]) => {
    if (fold[name] !== undefined) return fold[name];
    if (ls.some((l) => l.id === next.id)) return false;
    if (ls.every((l) => stars[l.id])) return true; // クリア済み
    const k = ALL_LEVELS.findIndex((l) => l.id === ls[0].id);
    return !UNLOCK_ALL && !stars[ls[0].id] && k > 0 && !stars[ALL_LEVELS[k - 1].id]; // まだ来ていない
  };
  useEffect(() => {
    if (nextIdx > 2) document.querySelector('.lv.next')?.scrollIntoView({ block: 'center' });
  }, [nextIdx]);
  let idx = 0;
  return (
    <div className="home">
      <div className="home-hero">
        <div className="home-chars" aria-hidden>
          <img className="hc hc-hero" src={IMG.hero} alt="" draggable={false} />
          <img className="hc hc-ghost" src={IMG.ghost} alt="" draggable={false} />
          <img className="hc hc-exit" src={IMG.exit} alt="" draggable={false} />
        </div>
        <h1>かげループ</h1>
        <p className="tag">過去の自分と、力を合わせて出口へ。</p>
        <button className="primary go" onClick={() => onPlay(nextIdx)}>
          {started ? 'つづきから' : 'はじめる'}　<b>{next.id}</b> {next.name}
        </button>
      </div>
      {WORLDS.map((w) => {
        const folded = isFolded(w.name, w.levels);
        const wGot = w.levels.reduce((a, l) => a + (stars[l.id] ?? 0), 0);
        const start = idx;
        idx += w.levels.length;
        return (
          <section key={w.name} className="world">
            <h2>
              <button className="world-head" aria-expanded={!folded} onClick={() => setFold({ ...fold, [w.name]: !folded })}>
                <span>
                  {folded ? '▸' : '▾'} {w.name}
                </span>
                <span className="world-got">
                  ★ {wGot} / {w.levels.length * 3}
                </span>
              </button>
            </h2>
            {!folded && (
              <div className="lv-grid">
                {w.levels.map((lv, k) => {
                  const i = start + k;
                  const s = stars[lv.id] ?? 0;
                  const open = UNLOCK_ALL || i === 0 || stars[ALL_LEVELS[i - 1].id] !== undefined || s > 0;
                  return (
                    <button key={lv.id} className={`lv${open ? '' : ' locked'}${i === nextIdx ? ' next' : ''}`} disabled={!open} onClick={() => onPlay(i)}>
                      <b>{lv.id}</b>
                      <span className="lv-name">{lv.name}</span>
                      <span className="lv-stars">
                        <Star on={s >= 1} />
                        <Star on={s >= 2} />
                        <Star on={s >= 3} />
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}
      <p className="count">
        ★ {got} / {total * 3}
      </p>
      <button
        className="reset"
        onClick={() => {
          if (confirm('きろくをぜんぶ消しますか？')) {
            clearStars();
            location.reload();
          }
        }}
      >
        テスト用（きろくをけす）
      </button>
    </div>
  );
}

function Help({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <h3>あそびかた</h3>
        <ul>
          <li>1 ループは決まった手数。上下左右に 1 マス動くか、その場で待つ。</li>
          <li>
            ループが終わると、あなたの動きが<b>かげ</b>になって、次のループで同じ時刻に同じ道を歩く。かげは終わった場所に立ち続ける。
          </li>
          <li>
            <b>スイッチ</b>（床の丸）にかげか自分が乗っている間だけ、同じ色の<b>扉</b>が開く。
          </li>
          <li>
            <b>しましまの扉</b>は逆。同じ色のスイッチが<b>空いている間だけ</b>開く。
          </li>
          <li>かげは自分にぶつからない。出口に着けばクリア。ループが少ないほど星が多い。</li>
        </ul>
        <button className="primary" onClick={onClose}>
          とじる
        </button>
      </div>
    </div>
  );
}

/** しましまの扉の初見説明（その扉が初めて出る面で 1 度だけ） */
function InvIntro({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <h3>しましまの扉</h3>
        <div className="inv-demo" aria-hidden>
          <div className="inv-pair">
            <div className="inv-cell">
              <img src={IMG.plate[0]} alt="" />
              <small>だれかが乗る</small>
            </div>
            <span>→</span>
            <div className="inv-cell">
              <img src={IMG.gate[0]} alt="" />
              <span className="inv-mark" />
              <small>とじる</small>
            </div>
          </div>
          <div className="inv-pair">
            <div className="inv-cell">
              <img src={IMG.plate[0]} alt="" />
              <small>だれもいない</small>
            </div>
            <span>→</span>
            <div className="inv-cell open">
              <img src={IMG.gate[0]} alt="" />
              <span className="inv-mark" />
              <small>あく</small>
            </div>
          </div>
        </div>
        <p>ふつうの扉と<b>反対</b>。同じ色のスイッチが<b>空いている間だけ</b>開く。かげを置きっぱなしにすると閉じたままになる。</p>
        <button className="primary" onClick={onClose}>
          わかった
        </button>
      </div>
    </div>
  );
}

function Game({ idx, onBack, onStars, onNext }: { idx: number; onBack: () => void; onStars: (s: Stars) => void; onNext: () => void }) {
  const level = ALL_LEVELS[idx];
  const b = useMemo(() => parse(level), [level]);
  const [p, setP] = useState<Play>(() => newPlay(b));
  const [shake, setShake] = useState(false);
  const [help, setHelp] = useState(false);
  const hasInv = level.rows.some((r) => /[123]/.test(r));
  const [invIntro, setInvIntro] = useState(() => hasInv && !hasSeen('inv'));
  const [ans, setAns] = useState<number | null>(null);
  const sol = (solutions as Record<string, number[][]>)[level.id] ?? null;
  const [toast, setToast] = useState('');
  const [flash, setFlash] = useState(0);
  const [, force] = useState(0);
  const stageRef = useRef<HTMLDivElement>(null);
  const pRef = useRef(p);
  pRef.current = p;
  const savedRef = useRef(false);
  const toastTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    saveLast(level.id);
  }, [level.id]);

  useEffect(() => {
    setP(newPlay(b));
    setAns(null);
    savedRef.current = false;
  }, [b]);

  const say = useCallback((m: string) => {
    setToast(m);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(''), 1500);
  }, []);

  const move = useCallback(
    (d: Dir) => {
      const cur = pRef.current;
      const r = step(b, cur, d);
      if (r.kind === 'blocked') {
        if (cur.won) return;
        sfx.blocked();
        setShake(true);
        window.setTimeout(() => setShake(false), 280);
        if (r.reason === 'door') say('扉が閉まっている。スイッチを踏んだかげが要る。');
        return;
      }
      const next = r.play;
      // 扉・スイッチの音
      const m0 = ghostMasks(b, cur.ghosts);
      const t0 = timeOf(cur);
      const occBefore = m0[t0] | plateBit(b.cells[cur.cur[t0]]);
      const m1 = ghostMasks(b, next.ghosts);
      const t1 = Math.min(timeOf(next), b.T);
      const occAfter = m1[t1] | plateBit(b.cells[next.cur[next.cur.length - 1]]);
      if (r.committed) {
        sfx.record();
        setFlash((n) => n + 1);
      } else if (next.won) sfx.win();
      else if (occAfter !== occBefore) (occAfter & ~occBefore ? sfx.doorOpen : sfx.doorClose)();
      else sfx.step();
      if (r.committed) say(`${cur.loops} 回目がかげになった`);
      pRef.current = next;
      setP(next);
    },
    [b, say],
  );

  const waiting = useRef(false);
  const waitN = useCallback(
    async (n: number) => {
      if (waiting.current) return;
      waiting.current = true;
      for (let i = 0; i < n; i++) {
        if (pRef.current.won) break;
        move(0);
        await new Promise((r) => window.setTimeout(r, 140));
      }
      waiting.current = false;
    },
    [move],
  );

  const doUndo = useCallback(() => {
    sfx.undo();
    setP(undo(pRef.current));
  }, []);

  // 横長の盤は、主人公が真ん中に来るように横スクロールで追う
  const meX = p.cur[p.cur.length - 1] % b.w;
  useEffect(() => {
    const el = stageRef.current;
    const board = el?.querySelector<HTMLElement>('.board');
    if (!el || !board || board.offsetWidth <= el.clientWidth) return;
    const cell = board.offsetWidth / b.w;
    el.scrollTo({ left: (meX + 0.5) * cell - el.clientWidth / 2, behavior: 'smooth' });
  }, [meX, b.w, p.loops]);

  // クリアしたら記録
  useEffect(() => {
    if (p.won && !savedRef.current) {
      savedRef.current = true;
      onStars(saveStar(level.id, starsFor(p.loops, level.par)));
    }
  }, [p.won, p.loops, level, onStars]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, Dir> = { ArrowUp: 1, w: 1, ArrowDown: 2, s: 2, ArrowLeft: 3, a: 3, ArrowRight: 4, d: 4, ' ': 0 };
      const d = map[e.key];
      if (d !== undefined) {
        e.preventDefault();
        move(d);
      } else if (e.key === 'z' || e.key === 'Backspace') doUndo();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [move, doUndo]);

  // スワイプ
  const sw = useRef<{ x: number; y: number } | null>(null);
  const onDown = (e: React.PointerEvent) => {
    sw.current = { x: e.clientX, y: e.clientY };
  };
  const onUp = (e: React.PointerEvent) => {
    const s = sw.current;
    sw.current = null;
    if (!s) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 4 : 3) : dy > 0 ? 2 : 1);
  };

  const t = timeOf(p);
  const left = b.T - t;
  const earned = starsFor(p.loops, level.par);
  const last = idx === ALL_LEVELS.length - 1;

  return (
    <div className="play">
      <header className="bar">
        <button className="round" onClick={onBack} aria-label="もどる">
          ‹
        </button>
        <div className="title">
          <b>{level.id}</b> {level.name}
        </div>
        <button className="round" onClick={() => {
            setMuted(!isMuted());
            force((n) => n + 1);
          }} aria-label="音">
          {isMuted() ? '🔇' : '🔊'}
        </button>
        <button className="round" onClick={() => setHelp(true)} aria-label="あそびかた">
          ?
        </button>
      </header>
      <div className="status">
        <span className="pill">
          ループ <b>{p.loops}</b> / <span className="par">めやす {level.par}</span>
        </span>
        <span className="pill clock">
          <span className="pips">
            {Array.from({ length: b.T }, (_, i) => (
              <i key={i} className={i < t ? 'used' : ''} />
            ))}
          </span>
          のこり <b>{left}</b>
        </span>
      </div>

      <div className="stage-wrap">
        <div className="stage" ref={stageRef} onPointerDown={onDown} onPointerUp={onUp}>
          <BoardView b={b} p={p} shake={shake} answer={ans !== null && sol ? sol[ans] : null} />
        </div>
        {flash > 0 && <div key={flash} className="record-flash" />}
        {toast && <div className="toast">{toast}</div>}
        {level.hint && p.loops === 1 && t === 0 && <div className="hint">{level.hint}</div>}
      </div>

      <div className="pad">
        <button onClick={() => move(1)} aria-label="上" className="up">
          ▲
        </button>
        <button onClick={() => move(3)} aria-label="左" className="left">
          ◀
        </button>
        <button onClick={() => move(0)} aria-label="待つ" className="wait">
          待つ
        </button>
        <button onClick={() => move(4)} aria-label="右" className="right">
          ▶
        </button>
        <button onClick={() => void waitN(3)} aria-label="3手待つ" className="wait3">
          3手待つ
        </button>
        <button onClick={() => move(2)} aria-label="下" className="down">
          ▼
        </button>
      </div>

      <div className="actions">
        <button onClick={doUndo} disabled={t === 0}>
          1手もどす
        </button>
        <button onClick={() => setP((c) => resetLoop(c))} disabled={t === 0}>
          このループをやりなおす
        </button>
        <button onClick={() => (sfx.record(), setP(endLoop(pRef.current)))} disabled={t === 0}>
          ここでかげにする
        </button>
        <button onClick={() => setP((c) => backLoop(c))} disabled={p.ghosts.length === 0}>
          前のループにもどる
        </button>
        <button onClick={() => setP(newPlay(b))}>最初から</button>
        {sol && (
          <button className="answer-btn" onClick={() => setAns(ans === null ? 0 : null)}>
            {ans === null ? 'こたえをみる' : 'こたえをとじる'}
          </button>
        )}
      </div>
      {ans !== null && sol && (
        <div className="answer-bar">
          <button disabled={ans === 0} onClick={() => setAns(ans - 1)}>
            ‹
          </button>
          <span>
            こたえ {ans + 1} / {sol.length} ループ目{ans === sol.length - 1 ? '（出口へ）' : '（かげになる動き）'}
          </span>
          <button disabled={ans === sol.length - 1} onClick={() => setAns(ans + 1)}>
            ›
          </button>
        </div>
      )}

      {p.won && (
        <div className="modal win">
          <div className="confetti" aria-hidden>
            {Array.from({ length: 28 }, (_, i) => (
              <i key={i} style={{ ['--x' as string]: `${(i * 37) % 100}%`, ['--d' as string]: `${(i % 7) * 0.12}s`, ['--c' as string]: ['#ffd479', '#59b4ff', '#7ee08a', '#ffb84d', '#ff8fb0'][i % 5], ['--r' as string]: `${(i * 53) % 360}deg` }} />
            ))}
          </div>
          <div className="sheet">
            <h3>クリア！</h3>
            <div className="big-stars">
              {[1, 2, 3].map((n) => (
                <Star key={n} on={n <= earned} />
              ))}
            </div>
            <p>
              {p.loops} 回のループ
              <br />
              <span className="par">
                {earned === 3
                  ? p.loops === level.par
                    ? 'さいしょうの回数！'
                    : `★3 の条件（${level.par} 回以内）を達成`
                  : `あと ${p.loops - level.par} 回へらすと ★3（${level.par} 回以内）`}
              </span>
            </p>
            {!last && (
              <p className="par">
                つぎ: <b>{ALL_LEVELS[idx + 1].id}</b> {ALL_LEVELS[idx + 1].name}
              </p>
            )}
            <div className="row">
              <button onClick={() => setP(newPlay(b))}>もういちど</button>
              {last ? (
                <button className="primary" onClick={onBack}>
                  面の一覧へ
                </button>
              ) : (
                <button className="primary" onClick={onNext}>
                  つぎへ
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {help && <Help onClose={() => setHelp(false)} />}
      {invIntro && !help && (
        <InvIntro
          onClose={() => {
            markSeen('inv');
            setInvIntro(false);
          }}
        />
      )}
    </div>
  );
}

export default function App() {
  // 最初のタップ・キーで BGM を始める（ブラウザは操作前の音を許さない）
  useEffect(() => {
    const go = () => startBgm();
    window.addEventListener('pointerdown', go, { once: true });
    window.addEventListener('keydown', go, { once: true });
    // 画面が裏に回ったら止める
    const vis = () => (document.hidden ? stopBgm() : startBgm());
    document.addEventListener('visibilitychange', vis);
    return () => {
      document.removeEventListener('visibilitychange', vis);
      window.removeEventListener('pointerdown', go);
      window.removeEventListener('keydown', go);
    };
  }, []);
  const [screen, setScreen] = useState<Screen>(() => {
    const i = ALL_LEVELS.findIndex((l) => l.id === QS.get('lv'));
    return i >= 0 ? { name: 'play', idx: i } : { name: 'home' };
  });
  const [stars, setStars] = useState<Stars>(() => loadStars());
  if (screen.name === 'home') return <Home stars={stars} onPlay={(i) => setScreen({ name: 'play', idx: i })} />;
  return (
    <Game
      key={screen.idx}
      idx={screen.idx}
      onStars={setStars}
      onBack={() => setScreen({ name: 'home' })}
      onNext={() => setScreen({ name: 'play', idx: screen.idx + 1 })}
    />
  );
}
