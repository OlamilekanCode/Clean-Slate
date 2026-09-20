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

// ---------------------------------------------------------------------------------------------------
// Pure scoring rules (spec §4). These take per-rect pixel counts, never pixels, so the game logic built
// on them runs and tests without a browser or an editor.
// ---------------------------------------------------------------------------------------------------

/** Changed pixels and total pixels for one rect. */
export type Part = { changed: number; area: number };

/** Cover below this earns no credit. */
export const NO_CREDIT_COVER = 0.4;
/** Cover at or above this earns full credit. */
export const FULL_CREDIT_COVER = 0.75;
/** A seal rect with cover above this is breached. */
export const BREACH_COVER = 0.05;
/** Suspicion added the first time a seal is breached. */
export const BREACH_SUSPICION = 30;
/** Collateral (changed pixels outside every target) is free up to this fraction of the outside area. */
export const COLLATERAL_FREE = 0.3;
/** Suspicion per unit of collateral beyond the free allowance. */
export const COLLATERAL_RATE = 150;

/** f(c): 0 below 0.40, linear to 1 at 0.75. */
export function creditFor(cover: number): number {
  if (cover < NO_CREDIT_COVER) return 0;
  if (cover >= FULL_CREDIT_COVER) return 1;
  return (cover - NO_CREDIT_COVER) / (FULL_CREDIT_COVER - NO_CREDIT_COVER);
}

/**
 * Cover of one group: changed pixels over the union of its rects. Summing per-rect counts equals the union
 * only if the rects do not overlap, which holds for the emitted regions (subtract() fragments tile without
 * overlap) and is asserted on load by validateFrames in game/case.ts.
 */
export function groupCover(parts: Part[]): number {
  const area = parts.reduce((s, p) => s + p.area, 0);
  return area ? parts.reduce((s, p) => s + p.changed, 0) / area : 0;
}

/** A target's credit: the minimum across its groups, so every independent clue must be dealt with. */
export function targetCredit(groups: Part[][]): number {
  return groups.length ? Math.min(...groups.map((g) => creditFor(groupCover(g)))) : 0;
}

/** A seal is breached when any one of its rects passes the breach line. */
export function sealBreached(parts: Part[]): boolean {
  return parts.some((p) => p.area > 0 && p.changed / p.area > BREACH_COVER);
}

/** Suspicion from collateral: nothing up to the free allowance, then (c - 0.30) * 150. */
export function collateralSuspicion(collateral: number): number {
  return collateral > COLLATERAL_FREE ? (collateral - COLLATERAL_FREE) * COLLATERAL_RATE : 0;
}
