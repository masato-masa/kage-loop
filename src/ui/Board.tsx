import { type Board as B, doorOpen, ghostMasks, plateBit } from '../game/engine';
import { ghostAt, type Play, timeOf } from '../game/play';
import { IMG } from './assets';

export const LINK_COLORS = ['#59b4ff', '#ffb84d', '#7ee08a'];
const GHOST_HUES = ['#bfe6ff', '#ffe0b0', '#c9f5cf'];
// かげの絵は青白い。2 人目・3 人目は色相を回して見分ける。
const GHOST_FILTER = ['none', 'hue-rotate(150deg) saturate(1.3)', 'hue-rotate(-60deg) saturate(1.2)'];

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
          <img className="prop exit-img" src={IMG.exit} alt="" draggable={false} />
        </div>
      );
    if (c >= 'a' && c <= 'c') {
      const k = c.charCodeAt(0) - 97;
      const on = (occ & (1 << k)) !== 0;
      return (
        <div key={i} className={`cell floor plate${on ? ' on' : ''}`} style={{ ...style, ['--lc' as string]: LINK_COLORS[k] }}>
          <img className="prop plate-img" src={IMG.plate[k]} alt="" draggable={false} />
        </div>
      );
    }
    if ((c >= 'A' && c <= 'C') || (c >= '1' && c <= '3')) {
      const inv = c >= '1' && c <= '3';
      const k = inv ? c.charCodeAt(0) - 49 : c.charCodeAt(0) - 65;
      const open = doorOpen(c, occ);
      return (
        <div key={i} className={`cell floor door${inv ? ' inv' : ''}${open ? ' open' : ''}`} style={{ ...style, ['--lc' as string]: LINK_COLORS[k] }}>
          <img className="prop gate-img" src={IMG.gate[k]} alt="" draggable={false} />
          {inv && <span className="inv-mark" />}
        </div>
      );
    }
    return (
      <div key={i} className={`cell floor${i === b.start ? ' start' : ''}`} style={style}>
        {i === b.start && <img className="prop start-img" src={IMG.start} alt="" draggable={false} />}
      </div>
    );
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
          <img className="sprite" src={IMG.ghost} alt="" draggable={false} style={{ filter: GHOST_FILTER[gi % 3] }} />
          <i className="ghost-no">{gi + 1}</i>
        </div>
      ))}
      <div key={`me-${p.loops}`} className={`ent me${p.won ? ' won' : ''}`} style={entStyle(me)}>
        <img className="sprite" src={p.won ? IMG.heroCheer : IMG.hero} alt="" draggable={false} />
      </div>
    </div>
  );
}
