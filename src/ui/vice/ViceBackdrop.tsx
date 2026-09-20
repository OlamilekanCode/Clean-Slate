import { useMemo } from 'react';
import { rng } from '../../frames/sensor';

/** Seeded so the skyline is the same every render (and the same between runs). */
function skyline(seed: number) {
  const r = rng(seed);
  const blocks: { x: number; w: number; h: number; windows: [number, number][] }[] = [];
  let x = -10;
  while (x < 1010) {
    const w = 26 + r() * 46;
    const h = 26 + r() * 118 * (0.4 + 0.6 * Math.sin((x / 1000) * Math.PI));
    const windows: [number, number][] = [];
    for (let wy = 10; wy < h - 6; wy += 9)
      for (let wx = 5; wx < w - 5; wx += 8) if (r() > 0.72) windows.push([wx, wy]);
    blocks.push({ x, w, h, windows });
    x += w + 2 + r() * 8;
  }
  return blocks;
}

/** A palm silhouette: bent trunk plus a crown of drooping fronds. Drawn around (0, 0) at the base. */
function Palm({ scale = 1, flip = false }: { scale?: number; flip?: boolean }) {
  const fronds = [-150, -118, -86, -52, -20, 12, 44, 76];
  return (
    <g transform={`scale(${flip ? -scale : scale} ${scale})`}>
      <path
        d="M0 0 C 6 -90, 12 -170, 34 -250"
        stroke="#12051f"
        strokeWidth="11"
        fill="none"
        strokeLinecap="round"
      />
      <g transform="translate(34 -250)">
        {fronds.map((deg) => (
          <path
            key={deg}
            d="M0 0 C 40 -34, 96 -18, 128 34 C 88 -2, 44 -6, 0 8 Z"
            fill="#12051f"
            transform={`rotate(${deg})`}
          />
        ))}
        <circle r="7" fill="#12051f" />
      </g>
    </g>
  );
}

type Props = {
  /** 'full' for BOOT / BRIEF / VERDICT, 'dim' for the working screens. */
  mode?: 'full' | 'dim';
  className?: string;
};

/**
 * The Vice City backdrop: dusk sky, striped sun, skyline, palms and a neon grid floor. Everything is vector or
 * CSS, so there are no image assets. The grid scrolls toward the viewer and the palms sway.
 */
export default function ViceBackdrop({ mode = 'full', className = '' }: Props) {
  const blocks = useMemo(() => skyline(11), []);
  const stars = useMemo(() => {
    const r = rng(5);
    return Array.from({ length: 46 }, () => ({
      x: r() * 100,
      y: r() * 46,
      s: 1 + r() * 1.8,
      d: r() * 4,
    }));
  }, []);
  const dim = mode === 'dim';

  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      style={{ opacity: dim ? 0.55 : 1 }}
    >
      {/* sky */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to bottom, #07030f 0%, #150629 26%, #4a0d5e 46%, #b0207f 62%, #ff5f6d 74%, #ff9a3c 83%, #ffd166 88%, #2a0a3d 88.2%, #0b0418 100%)',
        }}
      />
      {/* stars */}
      {stars.map((s, i) => (
        <span
          key={i}
          className="absolute rounded-full bg-white"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: s.s,
            height: s.s,
            animation: `twinkle ${2.4 + s.d}s ease-in-out ${s.d}s infinite`,
          }}
        />
      ))}

      {/* sun with cut stripes */}
      <svg
        className="absolute left-1/2 -translate-x-1/2"
        style={{
          bottom: '11.5%',
          width: 'min(58vw, 620px)',
          animation: 'sun-pulse 5s ease-in-out infinite',
        }}
        viewBox="0 0 400 400"
      >
        <defs>
          <linearGradient id="sunfill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffe27a" />
            <stop offset="0.45" stopColor="#ff9a3c" />
            <stop offset="1" stopColor="#ff2d95" />
          </linearGradient>
          <mask id="sunmask">
            <rect width="400" height="400" fill="#fff" />
            {[0.52, 0.6, 0.67, 0.73, 0.79, 0.84, 0.885, 0.925].map((p, i) => (
              <rect key={p} x="0" y={400 * p} width="400" height={2 + i * 1.6} fill="#000" />
            ))}
          </mask>
        </defs>
        <circle cx="200" cy="200" r="190" fill="url(#sunfill)" mask="url(#sunmask)" />
      </svg>

      {/* skyline */}
      <svg
        className="absolute inset-x-0"
        style={{ bottom: '11.6%', height: '20%', width: '100%' }}
        viewBox="0 0 1000 160"
        preserveAspectRatio="none"
      >
        {blocks.map((b, i) => (
          <g key={i} transform={`translate(${b.x} ${160 - b.h})`}>
            <rect width={b.w} height={b.h + 2} fill="#14061f" />
            {b.windows.map(([wx, wy], k) => (
              <rect
                key={k}
                x={wx}
                y={wy}
                width="3"
                height="4"
                fill={k % 5 === 0 ? '#2de2e6' : k % 3 === 0 ? '#ff2d95' : '#ffd166'}
                opacity="0.75"
              />
            ))}
          </g>
        ))}
      </svg>

      {/* palms */}
      <svg
        className="absolute bottom-[10%] left-[-2%] origin-bottom"
        style={{
          height: '58%',
          animation: 'sway 7s ease-in-out infinite',
          transformOrigin: '50% 100%',
        }}
        viewBox="-40 -380 300 400"
      >
        <Palm scale={1.15} />
      </svg>
      <svg
        className="absolute bottom-[10%] right-[-3%]"
        style={{
          height: '46%',
          animation: 'sway 8s ease-in-out -2s infinite',
          transformOrigin: '50% 100%',
        }}
        viewBox="-260 -380 300 400"
      >
        <Palm scale={1} flip />
      </svg>

      {/* neon grid floor */}
      <div className="absolute inset-x-0 bottom-0" style={{ height: '12%', perspective: '220px' }}>
        <div
          className="absolute -inset-x-[60%] bottom-0 top-0"
          style={{
            transform: 'rotateX(62deg)',
            transformOrigin: '50% 0%',
            backgroundImage:
              'linear-gradient(to right, rgba(255,45,149,0.85) 1.5px, transparent 1.5px), linear-gradient(to bottom, rgba(45,226,230,0.75) 1.5px, transparent 1.5px)',
            backgroundSize: '64px 64px',
            animation: 'grid-scroll 1.6s linear infinite',
            maskImage: 'linear-gradient(to bottom, transparent 0%, #000 45%)',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, #000 45%)',
          }}
        />
      </div>

      {/* haze and vignette so text stays readable */}
      <div
        className="absolute inset-0"
        style={{
          background: dim
            ? 'radial-gradient(ellipse at 50% 40%, rgba(7,9,12,0.55), rgba(7,9,12,0.92))'
            : 'radial-gradient(ellipse at 50% 58%, transparent 30%, rgba(7,3,15,0.7) 100%)',
        }}
      />
    </div>
  );
}
