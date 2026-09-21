import type { Rect } from '../frames/sensor';

export type Outline = {
  id: string;
  rects: Rect[];
  color: string;
  label: string;
  /** Seconds before this outline starts drawing on. */
  delay: number;
  dashed?: boolean;
  /** Fill flash when the outline lands (used by the analysis reveal). */
  fill?: boolean;
};

/**
 * A frame image with region outlines drawn over it. The SVG uses the same `meet` letterboxing as the image's
 * object-contain, so the outlines sit exactly on the pixels they describe at any size.
 */
export default function Outlines({
  src,
  W,
  H,
  outlines,
  className = '',
}: {
  src: string;
  W: number;
  H: number;
  outlines: Outline[];
  className?: string;
}) {
  const stroke = Math.max(2, W / 420);
  const font = Math.max(17, W / 50);
  return (
    <div className={`relative ${className}`} style={{ aspectRatio: `${W} / ${H}` }}>
      <img
        src={src}
        alt=""
        className="absolute inset-0 h-full w-full object-contain"
        draggable={false}
      />
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
      >
        {outlines.map((o) =>
          o.rects.map((r, i) => {
            const x = r.x * W;
            const y = r.y * H;
            const w = r.w * W;
            const h = r.h * H;
            const pad = stroke * 1.5;
            const labelW = o.label.length * font * 0.62 + font;
            const labelX = Math.max(2, Math.min(x - pad, W - labelW - 2));
            const above = y - pad - font * 1.6 >= 2;
            const labelY = above ? y - pad - font * 1.6 : Math.min(H - font * 1.6, y + h + pad + 2);
            return (
              <g key={`${o.id}-${i}`}>
                {o.fill && (
                  <rect
                    x={x - pad}
                    y={y - pad}
                    width={w + pad * 2}
                    height={h + pad * 2}
                    fill={o.color}
                    opacity="0"
                    style={{ animation: `fill-flash 1.1s ease-out ${o.delay + 0.55}s both` }}
                  />
                )}
                <rect
                  x={x - pad}
                  y={y - pad}
                  width={w + pad * 2}
                  height={h + pad * 2}
                  fill="none"
                  stroke={o.color}
                  strokeWidth={stroke}
                  pathLength={1}
                  strokeDasharray={o.dashed ? '0.02 0.012' : '1'}
                  strokeDashoffset={o.dashed ? 0 : 1}
                  style={{
                    filter: `drop-shadow(0 1px 2px rgba(0,0,0,0.7))`,
                    animation: o.dashed
                      ? `fade-in 0.6s ease-out ${o.delay}s both`
                      : `draw-on 0.7s cubic-bezier(.2,.8,.2,1) ${o.delay}s forwards`,
                    opacity: o.dashed ? undefined : 1,
                  }}
                />
                {i === 0 && (
                  <g style={{ animation: `fade-in 0.4s ease-out ${o.delay + 0.5}s both` }}>
                    <rect
                      x={labelX}
                      y={labelY}
                      width={labelW}
                      height={font * 1.5}
                      fill="rgba(6,7,12,0.92)"
                      rx={font * 0.28}
                      stroke={o.color}
                      strokeWidth={stroke / 2}
                    />
                    <text
                      x={labelX + font * 0.5}
                      y={labelY + font * 1.08}
                      fill={o.color}
                      fontSize={font}
                      fontFamily="ui-monospace, Consolas, monospace"
                      fontWeight="700"
                      letterSpacing="0.06em"
                    >
                      {o.label}
                    </text>
                  </g>
                )}
              </g>
            );
          }),
        )}
      </svg>
    </div>
  );
}
