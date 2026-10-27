import { useEffect, useMemo, useState } from 'react';
import { ZONE_META } from '../lib/zones.js';
import { formatCount } from '../lib/format.js';
import { LocateIcon } from './Icons.jsx';

const SEEN_KEY = 'moo-seen-intro';

export function hasSeenIntro() {
  try {
    return localStorage.getItem(SEEN_KEY) === '1';
  } catch {
    return false;
  }
}

// Three clusters the scattered "racks" fly into — the whole idea of the app in
// one motion: lots of racks become a few spots.
const CLUSTERS = [
  [-74, -18],
  [8, 30],
  [82, -26]
];

function seeded(i) {
  const x = Math.sin(i * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

/**
 * Opening screen. First visit: scattered racks gather into spots, the wordmark
 * rises in, three lines say what the app does, then a button. Return visits:
 * the same motion, shortened, then it gets out of the way by itself.
 */
export default function Splash({ onDone }) {
  const first = useMemo(() => !hasSeenIntro(), []);
  const [phase, setPhase] = useState('in'); // in → gather → ready → out
  const reduce = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, []);

  const dots = useMemo(
    () =>
      Array.from({ length: 21 }, (_, i) => {
        const [cx, cy] = CLUSTERS[i % 3];
        const a = seeded(i) * Math.PI * 2;
        const r = 6 + seeded(i + 40) * 12;
        return {
          sx: (seeded(i + 7) - 0.5) * 300,
          sy: (seeded(i + 19) - 0.5) * 220,
          ex: cx + Math.cos(a) * r,
          ey: cy + Math.sin(a) * r,
          delay: Math.round(seeded(i + 3) * 220)
        };
      }),
    []
  );

  const leave = () => {
    if (phase === 'out') return;
    try {
      localStorage.setItem(SEEN_KEY, '1');
    } catch {
      /* fine */
    }
    setPhase('out');
    setTimeout(onDone, reduce ? 0 : 520);
  };

  useEffect(() => {
    const t1 = setTimeout(() => setPhase((p) => (p === 'in' ? 'gather' : p)), reduce ? 0 : 380);
    const t2 = setTimeout(() => setPhase((p) => (p === 'gather' ? 'ready' : p)), reduce ? 0 : 1500);
    // Returning riders already know the pitch — get them to the map.
    const t3 = first ? null : setTimeout(leave, reduce ? 300 : 2100);
    return () => [t1, t2, t3].forEach((t) => t && clearTimeout(t));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onKey = (e) => (e.key === 'Escape' || e.key === 'Enter') && leave();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const word = 'mooSpots';

  return (
    <div
      className={'moo-splash is-' + phase + (first ? ' is-first' : '')}
      onClick={first ? undefined : leave}
      role="dialog"
      aria-label="Welcome to mooSpots"
    >
      <div className="moo-splash__grid" aria-hidden="true" />

      <div className="moo-splash__stage">
        <div className="moo-splash__dots" aria-hidden="true">
          {CLUSTERS.map(([x, y], i) => (
            <span key={'h' + i} className="moo-splash__halo" style={{ '--x': x + 'px', '--y': y + 'px', '--i': i }} />
          ))}
          {dots.map((d, i) => (
            <span
              key={i}
              className="moo-splash__dot"
              style={{
                '--sx': d.sx + 'px',
                '--sy': d.sy + 'px',
                '--ex': d.ex + 'px',
                '--ey': d.ey + 'px',
                '--delay': d.delay + 'ms'
              }}
            />
          ))}
        </div>

        <h1 className="moo-splash__title" aria-label={word}>
          {word.split('').map((ch, i) => (
            <span key={i} className={i < 3 ? 'is-moo' : ''} style={{ '--i': i }} aria-hidden="true">
              {ch}
            </span>
          ))}
        </h1>
        <svg className="moo-splash__swoosh" viewBox="0 0 220 18" aria-hidden="true">
          <path d="M4 12C50 4 120 2 216 9" />
        </svg>
        <p className="moo-splash__tag">
          {['Bike', 'parking,', 'sorted.'].map((w, i) => (
            <span key={w} style={{ '--i': i }}>
              {w}
            </span>
          ))}
        </p>
      </div>

      {first && (
        <div className="moo-splash__pitch">
          <ol className="moo-splash__steps">
            <li style={{ '--i': 0 }}>
              <b>{formatCount(ZONE_META.racksKept)}</b> campus racks, grouped into{' '}
              <b>{ZONE_META.zoneCount}</b> parking spots
            </li>
            <li style={{ '--i': 1 }}>The closest spots to you, ranked by how far you'd ride</li>
            <li style={{ '--i': 2 }}>Turn-by-turn directions right to the racks</li>
          </ol>
          <button type="button" className="moo-btn moo-btn--gold moo-btn--xl moo-splash__cta" onClick={leave}>
            <LocateIcon size={18} />
            Let&apos;s ride
          </button>
        </div>
      )}

      <div className="moo-splash__progress" aria-hidden="true" />
    </div>
  );
}
