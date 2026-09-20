import type { Frame } from '../frames/sensor';
import { MATERIAL, deltaMap, diffMask, toPixels } from './diff';
import { coverage } from './score';

/** Thresholds probed when measuring the export noise floor. */
export const PROBE_THRESHOLDS = [0, 2, 4, 8, 12, 16, 24, 32, 48];

/** Candidate MATERIAL values whose per-region cover is recorded, to choose a threshold from data. */
export const SWEEP_THRESHOLDS = [24, 32, 40, 48, 64, 80];

export type RegionReport = {
  id: string;
  kind: 'target' | 'seal';
  cover: number;
  changed: number;
  area: number;
};

export type Measurement = {
  /** First 30 chars of the saved data URL — tells us whether the editor returns PNG or JPEG. */
  prefix: string;
  bytes: number;
  naturalW: number;
  naturalH: number;
  sameSize: boolean;
  identicalString: boolean;
  /** Largest per-pixel delta anywhere in the frame. */
  maxDelta: number;
  /** Pixels whose delta exceeds each probed threshold. */
  overThreshold: Record<number, number>;
  regions: RegionReport[];
  /** Changed pixels outside every target rect, as a fraction of all pixels outside. */
  collateral: number;
  material: number;
  /** Per-region cover at each candidate MATERIAL, keyed by threshold then region id. */
  sweep: Record<number, Record<string, number>>;
};

/** Compare a saved image against the exact frame instance the player was given. */
export async function measure(frame: Frame, saved: string): Promise<Measurement> {
  const { W, H } = frame;
  const [orig, next] = await Promise.all([toPixels(frame.dataUrl, W, H), toPixels(saved, W, H)]);
  const delta = deltaMap(orig.px, next.px);
  const mask = diffMask(delta, MATERIAL);

  let maxDelta = 0;
  for (let i = 0; i < delta.length; i++) if (delta[i] > maxDelta) maxDelta = delta[i];
  const overThreshold: Record<number, number> = {};
  for (const t of PROBE_THRESHOLDS) {
    let n = 0;
    for (let i = 0; i < delta.length; i++) if (delta[i] > t) n++;
    overThreshold[t] = n;
  }

  const regions: RegionReport[] = [
    ...frame.targets.map((r) => ({ kind: 'target' as const, r })),
    ...frame.seals.map((r) => ({ kind: 'seal' as const, r })),
  ].map(({ kind, r }) => {
    const c = coverage(mask, W, H, r.rects);
    return { id: r.id, kind, cover: c.cover, changed: c.changed, area: c.area };
  });

  const sweep: Record<number, Record<string, number>> = {};
  for (const t of SWEEP_THRESHOLDS) {
    const mt = diffMask(delta, t);
    sweep[t] = {};
    for (const r of [...frame.targets, ...frame.seals]) sweep[t][r.id] = coverage(mt, W, H, r.rects).cover;
  }

  const all = coverage(mask, W, H, frame.targets.flatMap((t) => t.rects));
  let totalChanged = 0;
  for (let i = 0; i < mask.length; i++) totalChanged += mask[i];
  const outside = W * H - all.area;
  const collateral = outside ? (totalChanged - all.changed) / outside : 0;

  return {
    prefix: saved.slice(0, 30),
    bytes: saved.length,
    naturalW: next.naturalW,
    naturalH: next.naturalH,
    sameSize: next.naturalW === W && next.naturalH === H,
    identicalString: saved === frame.dataUrl,
    maxDelta,
    overThreshold,
    regions,
    collateral,
    material: MATERIAL,
    sweep,
  };
}
