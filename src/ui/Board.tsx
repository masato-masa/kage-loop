import { type Board as B, doorOpen, ghostMasks, plateBit } from '../game/engine';
import { ghostAt, type Play, timeOf } from '../game/play';

export const LINK_COLORS = ['#59b4ff', '#ffb84d', '#7ee08a'];
const GHOST_HUES = ['#bfe6ff', '#ffe0b0', '#c9f5cf'];

/** 自分・かげの顔（コードで描いた仮の絵。素材ができたら差し替える） */
export function Face({ ghost, tint, blink }: { ghost?: boolean; tint?: string; blink?: boolean }) {
  const body = ghost ? tint ?? '#bfe6ff' : '#fff1c9';
  return (
    <svg viewBox="0 0 100 100" className="face" aria-hidden>
      <ellipse cx="50" cy="90" rx="26" ry="5" fill="#000" opacity={ghost ? 0.12 : 0.28} />
      <path
        d="M22 84 C16 52 26 18 50 18 C74 18 84 52 78 84 C70 78 64 88 58 82 C52 90 46 78 42 84 C36 78 30 90 22 84 Z"
        fill={body}
        stroke={ghost ? '#ffffffaa' : '#6b4a2b'}
        strokeWidth="3"
        opacity={ghost ? 0.78 : 1}
      />
      <ellipse cx="40" cy="50" rx="5" ry={blink ? 1.5 : 7} fill="#2a2140" />
      <ellipse cx="60" cy="50" rx="5" ry={blink ? 1.5 : 7} fill="#2a2140" />
      <ellipse cx="33" cy="62" rx="6" ry="3.5" fill="#ff9aa8" opacity="0.6" />
      <ellipse cx="67" cy="62" rx="6" ry="3.5" fill="#ff9aa8" opacity="0.6" />
      {!ghost && <path d="M44 62 Q50 68 56 62" stroke="#2a2140" strokeWidth="3" fill="none" strokeLinecap="round" />}
      {!ghost && <path d="M34 22 L40 8 L48 20 M66 22 L60 8 L52 20" fill="#fff1c9" stroke="#6b4a2b" strokeWidth="3" strokeLinejoin="round" />}
    </svg>
  );
}

export function BoardView({ b, p, shake }: { b: B; p: Play; shake: boolean }) {
  const t = Math.min(timeOf(p), b.T);
  const masks = ghostMasks(b, p.ghosts);
  const me = p.cur[p.cur.length - 1];
  const occ = masks[t] | plateBit(b.cells[me]);
  const pct = (n: number, d: number) => `${(n * 100) / d}%`;
  const pos = (i: number) => ({ x: i % b.w, y: Math.floor(i / b.w) });

  const cells = b.cells.map((c, i) => {
    const { x, y } = pos(i);
    const style = { left: pct(x, b.w), top: pct(y, b.h), width: pct(1, b.w), height: pct(1, b.h) };
    if (c === '#') return <div key={i} className="cell wall" style={style} />;
    if (i === b.exit)
      return (
        <div key={i} className="cell exit" style={style}>
          <span className="exit-ring" />
        </div>
      );
    if (c >= 'a' && c <= 'c') {
      const k = c.charCodeAt(0) - 97;
      const on = (occ & (1 << k)) !== 0;
      return (
        <div key={i} className={`cell floor plate${on ? ' on' : ''}`} style={{ ...style, ['--lc' as string]: LINK_COLORS[k] }}>
          <span className="plate-disc" />
        </div>
      );
    }
    if ((c >= 'A' && c <= 'C') || (c >= '1' && c <= '3')) {
      const inv = c >= '1' && c <= '3';
      const k = inv ? c.charCodeAt(0) - 49 : c.charCodeAt(0) - 65;
      const open = doorOpen(c, occ);
      return (
        <div key={i} className={`cell floor door${inv ? ' inv' : ''}${open ? ' open' : ''}`} style={{ ...style, ['--lc' as string]: LINK_COLORS[k] }}>
          <span className="gate" />
        </div>
      );
    }
    return <div key={i} className={`cell floor${i === b.start ? ' start' : ''}`} style={style} />;
  });

  const trailPoints = (g: number[]) => {
    const pts: string[] = [];
    let prev = -1;
    for (const q of g) {
      if (q === prev) continue;
      prev = q;
      const { x, y } = pos(q);
      pts.push(`${x + 0.5},${y + 0.5}`);
    }
    return pts.join(' ');
  };

  const entStyle = (i: number) => {
    const { x, y } = pos(i);
    return { width: pct(1, b.w), height: pct(1, b.h), transform: `translate(${x * 100}%, ${y * 100}%)` };
  };

  return (
    <div className={`board${shake ? ' shake' : ''}`} style={{ aspectRatio: `${b.w} / ${b.h}`, ['--ratio' as string]: b.w / b.h }}>
      {cells}
      <svg className="trails" viewBox={`0 0 ${b.w} ${b.h}`} preserveAspectRatio="none" aria-hidden>
        {p.ghosts.map((g, gi) => (
          <polyline key={gi} points={trailPoints(g)} fill="none" stroke={GHOST_HUES[gi % 3]} strokeWidth="0.09" strokeDasharray="0.18 0.14" strokeLinecap="round" strokeLinejoin="round" opacity="0.55" />
        ))}
        <polyline points={trailPoints(p.cur)} fill="none" stroke="#fff1c9" strokeWidth="0.11" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
      </svg>
      {p.ghosts.map((g, gi) => (
        <div key={`${p.loops}-${gi}`} className="ent ghost" style={entStyle(ghostAt(g, t))}>
          <Face ghost tint={GHOST_HUES[gi % 3]} />
          <i className="ghost-no">{gi + 1}</i>
        </div>
      ))}
      <div key={`me-${p.loops}`} className={`ent me${p.won ? ' won' : ''}`} style={entStyle(me)}>
        <Face />
      </div>
    </div>
  );
}
