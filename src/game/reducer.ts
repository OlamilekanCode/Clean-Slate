import {
  CHAIN,
  SHIPPED,
  TOTAL_HEAT,
  scoreExhibit,
  type ExhibitCoverage,
  type ExhibitId,
  type ExhibitResult,
} from './case';

/** The whole run shares one clock, and it only ticks during EDIT. */
export const CLOCK_MS = 5 * 60 * 1000;

export type Phase = 'BOOT' | 'BRIEF' | 'EDIT' | 'ANALYSIS' | 'VERDICT';

export type EndingKind = 'TAMPERING' | 'CLEAN_SLATE' | 'SYNCED' | 'PARTIAL';
export type Ending = { kind: EndingKind; stars: number };

export type Results = Partial<Record<ExhibitId, ExhibitResult>>;

export type GameState = {
  phase: Phase;
  shipped: readonly ExhibitId[];
  /** Position in `shipped` of the exhibit being briefed, edited or analysed. */
  index: number;
  clockMs: number;
  /** The clock's starting value, kept so RESTART can reset it (a short clock is handy for testing). */
  clockTotalMs: number;
  /** True once the editor is loaded AND the image is mounted. The clock never runs before this. */
  editorReady: boolean;
  /** True from the moment a save starts until its score arrives. */
  saving: boolean;
  /** The clock expired. Remaining exhibits sync unedited and the run heads to the verdict. */
  timedOut: boolean;
  results: Results;
  ending: Ending | null;
};

export type Action =
  | { type: 'BOOT_DONE' }
  | { type: 'START_EDIT' }
  | { type: 'EDITOR_READY' }
  | { type: 'TICK'; ms: number }
  | { type: 'SAVE_STARTED' }
  | { type: 'SAVE_SCORED'; coverage: ExhibitCoverage }
  /** The save could not be read back (e.g. the image failed to decode). The player may try again. */
  | { type: 'SAVE_FAILED' }
  /** Leave this exhibit as it is: it syncs unedited. */
  | { type: 'SKIP' }
  | { type: 'NEXT' }
  | { type: 'RESTART' };

export function initialState(
  shipped: readonly ExhibitId[] = SHIPPED,
  clockMs: number = CLOCK_MS,
): GameState {
  return {
    phase: 'BOOT',
    shipped,
    index: 0,
    clockMs,
    clockTotalMs: clockMs,
    editorReady: false,
    saving: false,
    timedOut: false,
    results: {},
    ending: null,
  };
}

// ---------------------------------------------------------------------------------------------------
// Meters. Derived from the stored results, never stored, so they cannot drift out of step with them.
// ---------------------------------------------------------------------------------------------------

/** Heat starts at 100 across the shipped targets and falls by whatever each scored exhibit removed. */
export function heatOf(results: Results): number {
  let heat = TOTAL_HEAT;
  for (const r of Object.values(results)) for (const t of r.targets) heat -= t.heatRemoved;
  return Math.max(0, Math.min(TOTAL_HEAT, heat));
}

export function suspicionOf(results: Results): number {
  let s = 0;
  for (const r of Object.values(results)) s += r.suspicionAdded;
  return Math.min(100, s);
}

/** Heat handed to the witness photo by the ANPR car (0 until ANPR is scored). */
export function transferredToWitness(results: Results): number {
  const anpr = results[CHAIN.from.exhibit];
  return anpr?.targets.find((t) => t.id === CHAIN.from.target)?.transferred ?? 0;
}

/**
 * Endings, evaluated in this order:
 *   TAMPERING    suspicion >= 100                       instant end mid-run
 *   CLEAN SLATE  heat <= 5 and suspicion < 40           0 stars
 *   SYNCED       clock expired and heat > 60            6 stars, nothing changed
 *   PARTIAL      otherwise                              min(5, max(1, ceil(heat / 100 * 6)))
 * Partial is capped at 5 because six is reserved for SYNCED.
 */
export function resolveEnding(heat: number, suspicion: number, expired: boolean): Ending {
  // Tampering leaves you at the top of the wanted scale with a new felony on the sheet; the spec gives no
  // star count for it, so it shows the full six.
  if (suspicion >= 100) return { kind: 'TAMPERING', stars: 6 };
  if (heat <= 5 && suspicion < 40) return { kind: 'CLEAN_SLATE', stars: 0 };
  if (expired && heat > 60) return { kind: 'SYNCED', stars: 6 };
  // The epsilon stops float noise (e.g. 3.0000000000000004) from tipping a whole star up.
  const stars = Math.min(5, Math.max(1, Math.ceil((heat / TOTAL_HEAT) * 6 - 1e-9)));
  return { kind: 'PARTIAL', stars };
}

// ---------------------------------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------------------------------

const currentExhibit = (s: GameState): ExhibitId => s.shipped[s.index];

/** Score one exhibit unless it already has a result. This is what guarantees "exactly once". */
function scoreOnce(s: GameState, exhibit: ExhibitId, coverage: ExhibitCoverage | null): Results {
  if (s.results[exhibit]) return s.results;
  const result = scoreExhibit(s.shipped, exhibit, coverage, transferredToWitness(s.results));
  return { ...s.results, [exhibit]: result };
}

/** Leave every exhibit from `from` onwards unedited, each keeping its heat, in play order. */
function autoSync(s: GameState, from: number): Results {
  let next: GameState = s;
  for (let i = from; i < s.shipped.length; i++) {
    next = { ...next, results: scoreOnce(next, s.shipped[i], null) };
  }
  return next.results;
}

function finish(s: GameState, results: Results): GameState {
  const ending = resolveEnding(heatOf(results), suspicionOf(results), s.timedOut);
  return { ...s, results, phase: 'VERDICT', saving: false, editorReady: false, ending };
}

/** The clock ran out. A save already in flight wins: it scores, then the run ends. */
function expire(s: GameState): GameState {
  if (s.phase !== 'EDIT' || s.timedOut) return s;
  const expired = { ...s, clockMs: 0, timedOut: true };
  if (s.saving) return expired;
  return finish(expired, autoSync(expired, s.index));
}

export function reducer(s: GameState, a: Action): GameState {
  switch (a.type) {
    case 'BOOT_DONE':
      return s.phase === 'BOOT' ? { ...s, phase: 'BRIEF' } : s;

    case 'START_EDIT':
      return s.phase === 'BRIEF' ? { ...s, phase: 'EDIT', editorReady: false, saving: false } : s;

    case 'EDITOR_READY':
      return s.phase === 'EDIT' ? { ...s, editorReady: true } : s;

    case 'TICK': {
      if (s.phase !== 'EDIT' || !s.editorReady || s.timedOut) return s;
      const clockMs = Math.max(0, s.clockMs - a.ms);
      return clockMs === 0 ? expire({ ...s, clockMs }) : { ...s, clockMs };
    }

    case 'SAVE_STARTED':
      return s.phase === 'EDIT' && !s.saving && !s.results[currentExhibit(s)]
        ? { ...s, saving: true }
        : s;

    case 'SAVE_SCORED': {
      // A score for an exhibit that is not being edited, or was already scored, is stale: ignore it.
      if (s.phase !== 'EDIT' || s.results[currentExhibit(s)]) return s;
      const results = scoreOnce(s, currentExhibit(s), a.coverage);
      // Suspicion is the only instant death: it ends the run the moment it maxes.
      if (suspicionOf(results) >= 100) return finish(s, results);
      return { ...s, results, phase: 'ANALYSIS', saving: false, editorReady: false };
    }

    case 'SAVE_FAILED': {
      if (s.phase !== 'EDIT' || !s.saving) return s;
      // The clock ran out while the save was in flight and the save then failed: nothing to show, end the run.
      if (s.timedOut) return finish(s, autoSync(s, s.index));
      return { ...s, saving: false };
    }

    case 'SKIP': {
      if (s.phase !== 'EDIT' || s.saving || s.results[currentExhibit(s)]) return s;
      const results = scoreOnce(s, currentExhibit(s), null);
      return { ...s, results, phase: 'ANALYSIS', editorReady: false };
    }

    case 'NEXT': {
      if (s.phase !== 'ANALYSIS') return s;
      // Timed out during a save: that save counted, everything after it syncs unedited.
      if (s.timedOut) return finish(s, autoSync(s, s.index + 1));
      if (s.index + 1 >= s.shipped.length) return finish(s, s.results);
      return { ...s, phase: 'BRIEF', index: s.index + 1 };
    }

    case 'RESTART':
      return initialState(s.shipped, s.clockTotalMs);
  }
}
