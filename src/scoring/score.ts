import type { Rect } from '../frames/sensor';

/** Normalised (0–1) rect to integer pixel bounds, clamped to the frame. */
export function toPixelRect(r: Rect, W: number, H: number): Rect {
  const x0 = Math.max(0, Math.round(r.x * W));
  const y0 = Math.max(0, Math.round(r.y * H));
  const x1 = Math.min(W, Math.round((r.x + r.w) * W));
  const y1 = Math.min(H, Math.round((r.y + r.h) * H));
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

export type Coverage = { cover: number; area: number; changed: number };

/** Fraction of the UNION of rects covered by changed pixels. Overlapping rects are never double-counted. */
export function coverage(mask: Uint8Array, W: number, H: number, rects: Rect[]): Coverage {
  const inside = new Uint8Array(W * H);
  for (const r of rects) {
    const p = toPixelRect(r, W, H);
    for (let y = p.y; y < p.y + p.h; y++) inside.fill(1, y * W + p.x, y * W + p.x + p.w);
  }
  let area = 0;
  let changed = 0;
  for (let i = 0; i < inside.length; i++) {
    if (inside[i]) {
      area++;
      if (mask[i]) changed++;
    }
  }
  return { cover: area ? changed / area : 0, area, changed };
}
