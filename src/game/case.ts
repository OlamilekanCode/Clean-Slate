import type { Rect } from '../frames/sensor';
import type { ExhibitId } from '../scoring/calibration';
import type { Measurement } from '../scoring/measure';
import {
  BREACH_SUSPICION,
  collateralSuspicion,
  sealBreached,
  targetCredit,
  type Part,
} from '../scoring/score';

export type { ExhibitId };

export type TargetSpec = { id: string; rawWeight: number };

export type ExhibitSpec = {
  id: ExhibitId;
  /** Exhibit number as shown to the player (01–05). */
  number: number;
  title: string;
  /** Index into GENS in frames/evidence.ts. */
  generator: number;
  targets: TargetSpec[];
  seals: string[];
};

/**
 * The five exhibits with the raw weights from the spec. The eight base targets total 100 only when all five
 * ship, so never read these as points: use normalisedWeights() for the set actually shipped.
 * The witness photo's red-car is dormant and carries no weight of its own; it only holds heat transferred
 * from the ANPR car (see CHAIN).
 */
export const EXHIBITS: Record<ExhibitId, ExhibitSpec> = {
  cctv: {
    id: 'cctv',
    number: 1,
    title: 'CCTV still',
    generator: 0,
    targets: [
      { id: 'face', rawWeight: 18 },
      { id: 'jacket', rawWeight: 7 },
    ],
    seals: ['timecode', 'camera-id'],
  },
  anpr: {
    id: 'anpr',
    number: 2,
    title: 'ANPR traffic cam',
    generator: 1,
    targets: [
      { id: 'plate', rawWeight: 20 },
      { id: 'red-car', rawWeight: 13 },
    ],
    seals: ['timestamp', 'unit-id'],
  },
  report: {
    id: 'report',
    number: 3,
    title: 'Police report',
    generator: 2,
    targets: [
      { id: 'suspect-name', rawWeight: 13 },
      { id: 'vehicle-line', rawWeight: 7 },
    ],
    seals: ['evidence-stamp', 'custody-hash'],
  },
  broadcast: {
    id: 'broadcast',
    number: 4,
    title: 'News broadcast',
    generator: 3,
    targets: [
      { id: 'headline-name', rawWeight: 15 },
      { id: 'strap-vehicle', rawWeight: 7 },
    ],
    seals: ['channel-bug', 'ticker'],
  },
  witness: {
    id: 'witness',
    number: 5,
    title: 'Witness photo',
    generator: 4,
    targets: [{ id: 'red-car', rawWeight: 0 }],
    seals: ['geotag', 'device-meta'],
  },
};

/**
 * The exhibits in play, in order. The three-item slice is the fallback product: tutorial, the multi-rect car
 * target, and the chain. Add 'report' and 'broadcast' once they are calibrated.
 */
export const SHIPPED: readonly ExhibitId[] = ['cctv', 'anpr', 'witness'];

/** Hiding the car in the ANPR capture is what makes it incriminating in the witness photo. */
export const CHAIN = {
  from: { exhibit: 'anpr', target: 'red-car' },
  to: { exhibit: 'witness', target: 'red-car' },
} as const satisfies {
  from: { exhibit: ExhibitId; target: string };
  to: { exhibit: ExhibitId; target: string };
};

/** The chain only exists when both ends ship; otherwise the car is scored normally in the ANPR frame. */
export const isChainActive = (shipped: readonly ExhibitId[]): boolean =>
  shipped.includes(CHAIN.from.exhibit) && shipped.includes(CHAIN.to.exhibit);

export const TOTAL_HEAT = 100;

/** Key for a target across exhibits, since 'red-car' appears in two. */
export const targetKey = (exhibit: ExhibitId, target: string): string => `${exhibit}:${target}`;

/**
 * weight(t) = rawWeight(t) / raw * 100, with raw summed over the targets of the exhibits actually shipped.
 * Without normalising, the three-item slice (raw total 58) could never get heat below 42.
 */
export function normalisedWeights(shipped: readonly ExhibitId[] = SHIPPED): Record<string, number> {
  const all = shipped.flatMap((id) => EXHIBITS[id].targets.map((t) => ({ id, t })));
  const raw = all.reduce((s, { t }) => s + t.rawWeight, 0);
  const out: Record<string, number> = {};
  for (const { id, t } of all)
    out[targetKey(id, t.id)] = raw ? (t.rawWeight / raw) * TOTAL_HEAT : 0;
  return out;
}

/**
 * Splits a target's per-rect data into independent groups. The assets know nothing about groups.
 * Rects inside a group are fragments of one visual thing and are scored as a union; groups are separate
 * clues and the target's credit is the minimum across them.
 *
 *   anpr    red-car  one group: the body fragments (subtract(body, plate) leaves the plate out)
 *   witness red-car  two groups: body fragments, then the plate, which the generator appends last
 *   everything else  one rect, one group
 */
export function groupsOf<T>(exhibit: ExhibitId, target: string, items: T[]): T[][] {
  if (exhibit === 'witness' && target === 'red-car' && items.length >= 2) {
    return [items.slice(0, -1), items.slice(-1)];
  }
  return [items];
}

// ---------------------------------------------------------------------------------------------------
// Scoring one exhibit
// ---------------------------------------------------------------------------------------------------

/** What the saved image changed, as pixel counts. This is all the game logic ever sees of an edit. */
export type ExhibitCoverage = {
  targets: Record<string, Part[]>;
  seals: Record<string, Part[]>;
  /** Changed pixels outside every target rect, as a fraction of the pixels outside. */
  collateral: number;
};

export function coverageFromMeasurement(m: Measurement): ExhibitCoverage {
  const targets: Record<string, Part[]> = {};
  const seals: Record<string, Part[]> = {};
  for (const r of m.regions) (r.kind === 'target' ? targets : seals)[r.id] = r.parts;
  return { targets, seals, collateral: m.collateral };
}

export type TargetResult = {
  id: string;
  /** 0–1, minimum across the target's groups. */
  credit: number;
  /** Normalised heat this target is worth. For the witness car, the heat transferred in from ANPR. */
  weight: number;
  /** Heat actually removed. Zero for the ANPR car when the chain moves its weight to the witness photo. */
  heatRemoved: number;
  /** Heat moved to another exhibit instead of removed (ANPR car only, when the chain is active). */
  transferred: number;
};

export type ExhibitResult = {
  exhibit: ExhibitId;
  /** True when nothing was saved (timeout or auto-sync): every credit and breach is zero. */
  unedited: boolean;
  targets: TargetResult[];
  /** Seals breached by this save. Each seal is charged once, however many rects pass the line. */
  breached: string[];
  collateral: number;
  collateralSuspicion: number;
  suspicionAdded: number;
};

/**
 * Score one exhibit. `coverage` is null for an unedited exhibit. `transferIn` is the heat handed over by the
 * ANPR car (only ever non-zero for the witness photo).
 */
export function scoreExhibit(
  shipped: readonly ExhibitId[],
  exhibit: ExhibitId,
  coverage: ExhibitCoverage | null,
  transferIn: number,
): ExhibitResult {
  const spec = EXHIBITS[exhibit];
  const weights = normalisedWeights(shipped);
  const chain = isChainActive(shipped);

  const targets = spec.targets.map((t): TargetResult => {
    const parts = coverage?.targets[t.id] ?? [];
    const credit = parts.length ? targetCredit(groupsOf(exhibit, t.id, parts)) : 0;
    const isDormantEnd = chain && exhibit === CHAIN.to.exhibit && t.id === CHAIN.to.target;
    const isChainSource = chain && exhibit === CHAIN.from.exhibit && t.id === CHAIN.from.target;
    const weight = isDormantEnd ? transferIn : (weights[targetKey(exhibit, t.id)] ?? 0);
    const value = weight * credit;
    return {
      id: t.id,
      credit,
      weight,
      heatRemoved: isChainSource ? 0 : value,
      transferred: isChainSource ? value : 0,
    };
  });

  const breached = spec.seals.filter((s) => coverage && sealBreached(coverage.seals[s] ?? []));
  const collateral = coverage?.collateral ?? 0;
  const colSus = collateralSuspicion(collateral);

  return {
    exhibit,
    unedited: coverage === null,
    targets,
    breached,
    collateral,
    collateralSuspicion: colSus,
    suspicionAdded: breached.length * BREACH_SUSPICION + colSus,
  };
}

// ---------------------------------------------------------------------------------------------------
// Load-time checks on the generated frames
// ---------------------------------------------------------------------------------------------------

type RegionLike = { id: string; rects: Rect[] };
export type FrameRegions = { targets: RegionLike[]; seals: RegionLike[] };

const overlap = (a: Rect, b: Rect): number => {
  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return w > 0 && h > 0 ? w * h : 0;
};

/**
 * Returns a list of problems (empty when the frames match what the game assumes). The game trusts the
 * emitted regions completely, so check the assumptions instead of trusting an index silently:
 * ids match the spec, rects inside a group do not overlap (so summed per-rect counts equal the union),
 * and the witness car is the ANPR car's fragments plus exactly one trailing plate rect.
 */
export function validateFrames(frames: Partial<Record<ExhibitId, FrameRegions>>): string[] {
  const problems: string[] = [];
  for (const [id, frame] of Object.entries(frames) as [ExhibitId, FrameRegions][]) {
    const spec = EXHIBITS[id];
    const targetIds = frame.targets.map((t) => t.id).join(',');
    const sealIds = frame.seals.map((s) => s.id).join(',');
    if (targetIds !== spec.targets.map((t) => t.id).join(','))
      problems.push(`${id}: targets [${targetIds}] do not match the spec`);
    if (sealIds !== spec.seals.join(','))
      problems.push(`${id}: seals [${sealIds}] do not match the spec`);

    for (const t of frame.targets) {
      for (const group of groupsOf(id, t.id, t.rects)) {
        for (let i = 0; i < group.length; i++)
          for (let j = i + 1; j < group.length; j++)
            if (overlap(group[i], group[j]) > 1e-9)
              problems.push(`${id}/${t.id}: rects ${i} and ${j} of one group overlap`);
      }
    }
  }

  const anprCar = frames.anpr?.targets.find((t) => t.id === CHAIN.from.target);
  const witnessCar = frames.witness?.targets.find((t) => t.id === CHAIN.to.target);
  if (anprCar && witnessCar && witnessCar.rects.length !== anprCar.rects.length + 1)
    problems.push(
      `witness red-car has ${witnessCar.rects.length} rects, expected ${anprCar.rects.length + 1} ` +
        `(the ANPR body fragments plus the plate appended last)`,
    );
  return problems;
}
