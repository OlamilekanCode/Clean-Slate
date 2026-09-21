import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  BREACH_SUSPICION,
  collateralSuspicion,
  creditFor,
  sealBreached,
  targetCredit,
} from '../scoring/score';
import {
  EXHIBITS,
  SHIPPED,
  SLICE,
  isChainActive,
  normalisedWeights,
  scoreExhibit,
  targetKey,
  validateFrames,
  type ExhibitCoverage,
  type ExhibitId,
} from './case';
import {
  CLOCK_MS,
  heatOf,
  initialState,
  reducer,
  resolveEnding,
  suspicionOf,
  transferredToWitness,
  type Action,
  type GameState,
} from './reducer';

const near = (actual: number, expected: number, eps = 0.01) =>
  assert.ok(
    Math.abs(actual - expected) < eps,
    `expected ${actual} to be within ${eps} of ${expected}`,
  );

/** A rect's worth of pixels: `frac` of 1000 changed. */
const part = (frac: number) => ({ changed: Math.round(frac * 1000), area: 1000 });
const parts = (v: number | number[]) => (Array.isArray(v) ? v : [v]).map(part);

/** Build coverage from plain fractions. Anything not mentioned is untouched. */
function cov(
  exhibit: ExhibitId,
  targets: Record<string, number | number[]> = {},
  seals: Record<string, number | number[]> = {},
  collateral = 0,
): ExhibitCoverage {
  const t: ExhibitCoverage['targets'] = {};
  for (const spec of EXHIBITS[exhibit].targets) {
    // The witness car is four body fragments plus a trailing plate rect, like the real generator emits.
    const fallback = exhibit === 'witness' ? [0, 0, 0, 0, 0] : 0;
    t[spec.id] = parts(targets[spec.id] ?? fallback);
  }
  const s: ExhibitCoverage['seals'] = {};
  for (const id of EXHIBITS[exhibit].seals) s[id] = parts(seals[id] ?? 0);
  return { targets: t, seals: s, collateral };
}

const FULL_CAR = [1, 1, 1, 1, 1];

/** Drive one exhibit from BRIEF through to ANALYSIS (or wherever the reducer sends it). */
function edit(s: GameState, coverage: ExhibitCoverage): GameState {
  return [
    { type: 'START_EDIT' },
    { type: 'EDITOR_READY' },
    { type: 'SAVE_STARTED' },
    { type: 'SAVE_SCORED', coverage },
  ].reduce((acc, a) => reducer(acc, a as Action), s);
}
const next = (s: GameState) => reducer(s, { type: 'NEXT' });
const boot = () => reducer(initialState(SLICE), { type: 'BOOT_DONE' });

/** A perfect run on the slice: every target fully covered, no seal touched. */
function perfectRun(): GameState {
  let s = boot();
  s = next(edit(s, cov('cctv', { face: 1, jacket: 1 })));
  s = next(edit(s, cov('anpr', { plate: 1, 'red-car': 1 })));
  return next(edit(s, cov('witness', { 'red-car': FULL_CAR })));
}

describe('heat budget', () => {
  it('normalises the shipped slice to 100 and moves the car to 22.41', () => {
    const w = normalisedWeights(SLICE);
    near(
      Object.values(w).reduce((a, b) => a + b, 0),
      100,
      1e-9,
    );
    near(w[targetKey('cctv', 'face')], 31.03);
    near(w[targetKey('cctv', 'jacket')], 12.07);
    near(w[targetKey('anpr', 'plate')], 34.48);
    near(w[targetKey('anpr', 'red-car')], 22.41);
    assert.equal(w[targetKey('witness', 'red-car')], 0, 'the witness car is dormant');
  });

  it('also sums to 100 when all five exhibits ship, using the raw weights directly', () => {
    const all = ['cctv', 'anpr', 'report', 'broadcast', 'witness'] as const;
    const w = normalisedWeights(all);
    near(
      Object.values(w).reduce((a, b) => a + b, 0),
      100,
      1e-9,
    );
    near(w[targetKey('anpr', 'red-car')], 13);
    near(w[targetKey('cctv', 'face')], 18);
  });

  it('starts at 100', () => {
    assert.equal(heatOf({}), 100);
    assert.equal(heatOf(boot().results), 100);
  });
});

describe('credit', () => {
  it('is 0 below 0.40, linear to 0.75, then 1', () => {
    assert.equal(creditFor(0), 0);
    assert.equal(creditFor(0.399), 0);
    near(creditFor(0.575), 0.5);
    assert.equal(creditFor(0.75), 1);
    assert.equal(creditFor(1), 1);
  });

  it('takes the minimum across groups, so every independent clue must be dealt with', () => {
    const body = [part(1), part(1), part(1), part(1)];
    const plate = [part(0.1)];
    assert.equal(targetCredit([body, plate]), 0, 'a legible plate vetoes a hidden car body');
    assert.equal(targetCredit([body, [part(1)]]), 1);
  });

  it('unions a group so a sliver cannot veto the whole car', () => {
    // Three fragments fully covered and one thin strip untouched: the union is still well covered.
    const body = [
      { changed: 900, area: 1000 },
      { changed: 900, area: 1000 },
      { changed: 900, area: 1000 },
      { changed: 0, area: 20 },
    ];
    assert.equal(targetCredit([body]), 1);
  });

  it('gives the witness car no credit for the plate alone, or the body alone', () => {
    const plateOnly = cov('witness', { 'red-car': [0, 0, 0, 0, 1] });
    const bodyOnly = cov('witness', { 'red-car': [1, 1, 1, 1, 0] });
    const both = cov('witness', { 'red-car': FULL_CAR });
    const credit = (c: ExhibitCoverage) =>
      scoreExhibit(SLICE, 'witness', c, 22.41).targets[0].credit;
    assert.equal(credit(plateOnly), 0);
    assert.equal(credit(bodyOnly), 0);
    assert.equal(credit(both), 1);
  });
});

describe('the car chain', () => {
  it('detects when both ends ship', () => {
    assert.equal(isChainActive(SLICE), true);
    assert.equal(isChainActive(['cctv', 'anpr']), false);
  });

  it('transfers the car weight instead of removing it, so heat does not drop at ANPR', () => {
    let s = boot();
    s = next(edit(s, cov('cctv')));
    s = edit(s, cov('anpr', { 'red-car': 1 }));
    near(transferredToWitness(s.results), 22.41);
    assert.equal(heatOf(s.results), 100, 'concealing only the car earns credit but no heat drop');
    const car = s.results.anpr!.targets.find((t) => t.id === 'red-car')!;
    assert.equal(car.credit, 1);
    assert.equal(car.heatRemoved, 0);
  });

  it('is removed once, and only by clearing the witness photo', () => {
    let s = boot();
    s = next(edit(s, cov('cctv')));
    s = next(edit(s, cov('anpr', { 'red-car': 1 })));
    const beforeWitness = heatOf(s.results);
    s = edit(s, cov('witness', { 'red-car': FULL_CAR }));
    near(beforeWitness - heatOf(s.results), 22.41);
    near(heatOf(s.results), 100 - 22.41);
  });

  it('leaves the transferred heat in place when the witness photo is not cleared', () => {
    let s = boot();
    s = next(edit(s, cov('cctv')));
    s = next(edit(s, cov('anpr', { 'red-car': 1 })));
    s = edit(s, cov('witness'));
    assert.equal(heatOf(s.results), 100);
  });

  it('is proportional to the credit earned', () => {
    let s = boot();
    s = next(edit(s, cov('cctv')));
    // cover 0.575 is half credit
    s = next(edit(s, cov('anpr', { 'red-car': 0.575 })));
    near(transferredToWitness(s.results), 11.21, 0.02);
    s = edit(s, cov('witness', { 'red-car': FULL_CAR }));
    near(heatOf(s.results), 100 - 11.21, 0.02);
  });

  it('has nothing to clear in the witness photo if the car was never hidden at ANPR', () => {
    let s = boot();
    s = next(edit(s, cov('cctv')));
    s = next(edit(s, cov('anpr')));
    s = edit(s, cov('witness', { 'red-car': FULL_CAR }));
    assert.equal(heatOf(s.results), 100);
    assert.equal(s.results.witness!.targets[0].weight, 0);
  });

  it('removes the car normally when the witness photo does not ship', () => {
    const r = scoreExhibit(['cctv', 'anpr'], 'anpr', cov('anpr', { 'red-car': 1 }), 0);
    const car = r.targets.find((t) => t.id === 'red-car')!;
    assert.equal(car.transferred, 0);
    assert.ok(car.heatRemoved > 0);
  });

  it('lets a perfect run reach zero heat with every heat point accounted for', () => {
    const s = perfectRun();
    near(heatOf(s.results), 0, 1e-9);
    near(suspicionOf(s.results), 0, 1e-9);
    assert.equal(s.ending?.kind, 'CLEAN_SLATE');
  });
});

describe('suspicion', () => {
  it('charges a seal once, however many of its rects pass the line', () => {
    const twoRects = [part(0.3), part(0.4)];
    assert.equal(sealBreached(twoRects), true);
    const r = scoreExhibit(SLICE, 'cctv', cov('cctv', {}, { timecode: [0.3, 0.4] }), 0);
    assert.deepEqual(r.breached, ['timecode']);
    assert.equal(r.suspicionAdded, BREACH_SUSPICION);
  });

  it('charges each breached seal once, and ignores a nick under the line', () => {
    const two = scoreExhibit(
      SLICE,
      'cctv',
      cov('cctv', {}, { timecode: 0.4, 'camera-id': 0.4 }),
      0,
    );
    assert.equal(two.suspicionAdded, 60);
    const nick = scoreExhibit(SLICE, 'cctv', cov('cctv', {}, { timecode: 0.03 }), 0);
    assert.equal(nick.suspicionAdded, 0);
    assert.equal(
      sealBreached([part(0.05)]),
      false,
      'the line is exclusive: cover must exceed 0.05',
    );
  });

  it('charges collateral only beyond 30%, at 150 per unit', () => {
    assert.equal(collateralSuspicion(0.3), 0);
    near(collateralSuspicion(0.4), 15);
    const r = scoreExhibit(SLICE, 'cctv', cov('cctv', {}, {}, 0.5), 0);
    near(r.suspicionAdded, 30);
  });

  it('accumulates across exhibits', () => {
    let s = boot();
    s = next(edit(s, cov('cctv', {}, { timecode: 0.5 })));
    s = edit(s, cov('anpr', {}, { timestamp: 0.5 }));
    assert.equal(suspicionOf(s.results), 60);
  });

  it('ends the run the moment it maxes, mid-run', () => {
    let s = boot();
    s = next(edit(s, cov('cctv', {}, { timecode: 0.5, 'camera-id': 0.5 })));
    assert.equal(s.phase, 'BRIEF');
    s = edit(s, cov('anpr', {}, { timestamp: 0.5, 'unit-id': 0.5 }));
    assert.equal(suspicionOf(s.results), 100);
    assert.equal(s.phase, 'VERDICT', 'no ANALYSIS, no third exhibit');
    assert.equal(s.ending?.kind, 'TAMPERING');
    assert.equal(s.results.witness, undefined, 'the witness photo was never reached');
  });
});

describe('endings', () => {
  it('resolves in priority order', () => {
    assert.equal(resolveEnding(0, 100, false).kind, 'TAMPERING', 'suspicion beats everything');
    assert.equal(resolveEnding(80, 100, true).kind, 'TAMPERING');
    assert.equal(resolveEnding(0, 39, false).kind, 'CLEAN_SLATE');
    assert.equal(resolveEnding(5, 0, false).kind, 'CLEAN_SLATE', 'heat 5 still qualifies');
    assert.equal(resolveEnding(80, 0, true).kind, 'SYNCED');
    assert.equal(resolveEnding(60, 0, true).kind, 'PARTIAL', 'synced needs heat strictly above 60');
  });

  it('is not CLEAN SLATE when suspicion is 40 or more', () => {
    const e = resolveEnding(0, 40, false);
    assert.equal(e.kind, 'PARTIAL');
    assert.equal(e.stars, 1, 'at least one star');
  });

  it('gives SYNCED six stars and CLEAN SLATE none', () => {
    assert.equal(resolveEnding(100, 0, true).stars, 6);
    assert.equal(resolveEnding(0, 0, false).stars, 0);
  });

  it('never prints six stars for a run that engaged', () => {
    assert.equal(resolveEnding(99, 0, false).stars, 5, 'capped at five');
    assert.equal(resolveEnding(90, 0, false).stars, 5);
    assert.equal(resolveEnding(50, 0, false).stars, 3);
    assert.equal(resolveEnding(20, 0, false).stars, 2);
    assert.equal(resolveEnding(6, 0, false).stars, 1);
  });
});

describe('save and timeout resolve exactly once', () => {
  const ready = (s: GameState) =>
    [{ type: 'START_EDIT' }, { type: 'EDITOR_READY' }].reduce((a, x) => reducer(a, x as Action), s);

  it('does not run the clock before the editor is ready, or outside EDIT', () => {
    let s = boot();
    s = reducer(s, { type: 'TICK', ms: 1000 });
    assert.equal(s.clockMs, CLOCK_MS, 'BRIEF is paused');
    s = reducer(s, { type: 'START_EDIT' });
    s = reducer(s, { type: 'TICK', ms: 1000 });
    assert.equal(s.clockMs, CLOCK_MS, 'the CDN bundle loading is not charged to the player');
    s = reducer(s, { type: 'EDITOR_READY' });
    s = reducer(s, { type: 'TICK', ms: 1000 });
    assert.equal(s.clockMs, CLOCK_MS - 1000);
    s = reducer(s, { type: 'SAVE_STARTED' });
    s = reducer(s, { type: 'SAVE_SCORED', coverage: cov('cctv') });
    s = reducer(s, { type: 'TICK', ms: 1000 });
    assert.equal(s.clockMs, CLOCK_MS - 1000, 'ANALYSIS is paused');
  });

  it('lets a save that is in flight win when the clock expires, then ends the run', () => {
    let s = ready(boot());
    s = reducer(s, { type: 'SAVE_STARTED' });
    s = reducer(s, { type: 'TICK', ms: CLOCK_MS });
    assert.equal(s.phase, 'EDIT', 'still waiting for the save to score');
    assert.equal(s.timedOut, true);
    s = reducer(s, { type: 'SAVE_SCORED', coverage: cov('cctv', { face: 1, jacket: 1 }) });
    assert.equal(s.phase, 'ANALYSIS', 'the save is shown, not discarded');
    assert.equal(s.results.cctv!.unedited, false);
    s = next(s);
    assert.equal(s.phase, 'VERDICT');
    assert.equal(s.results.anpr!.unedited, true, 'later exhibits sync unedited');
    assert.equal(s.results.witness!.unedited, true);
    assert.equal(Object.keys(s.results).length, 3, 'each exhibit scored once');
  });

  it('syncs everything unedited when the clock expires with no save in flight', () => {
    let s = ready(boot());
    s = reducer(s, { type: 'TICK', ms: CLOCK_MS });
    assert.equal(s.phase, 'VERDICT');
    assert.equal(Object.keys(s.results).length, 3);
    assert.ok(Object.values(s.results).every((r) => r.unedited));
    assert.equal(heatOf(s.results), 100);
    assert.equal(s.ending?.kind, 'SYNCED', 'clock expired with heat above 60');
  });

  it('ignores a save that finishes after the run has already ended', () => {
    let s = ready(boot());
    s = reducer(s, { type: 'TICK', ms: CLOCK_MS });
    const before = s;
    s = reducer(s, { type: 'SAVE_SCORED', coverage: cov('cctv', { face: 1, jacket: 1 }) });
    assert.equal(s, before, 'state is untouched');
    assert.equal(heatOf(s.results), 100, 'the late save did not lower heat');
  });

  it('scores an exhibit once even if the same save arrives twice', () => {
    let s = ready(boot());
    s = reducer(s, { type: 'SAVE_STARTED' });
    s = reducer(s, { type: 'SAVE_SCORED', coverage: cov('cctv', { face: 1 }) });
    const once = s;
    s = reducer(s, { type: 'SAVE_SCORED', coverage: cov('cctv', { face: 1, jacket: 1 }) });
    assert.equal(s, once);
  });

  it('ignores a stale save that lands while the next exhibit is only being briefed', () => {
    let s = boot();
    s = next(edit(s, cov('cctv', { face: 1 })));
    assert.equal(s.phase, 'BRIEF');
    assert.equal(s.results.anpr, undefined);
    const before = s;
    // The previous exhibit's save resolving twice must never be booked against the next exhibit.
    s = reducer(s, { type: 'SAVE_SCORED', coverage: cov('cctv', { face: 1, jacket: 1 }) });
    assert.equal(s, before);
    assert.equal(s.results.anpr, undefined, 'ANPR was not scored by a save meant for CCTV');
  });

  it('does not expire twice', () => {
    let s = ready(boot());
    s = reducer(s, { type: 'SAVE_STARTED' });
    s = reducer(s, { type: 'TICK', ms: CLOCK_MS });
    const once = s;
    s = reducer(s, { type: 'TICK', ms: 5000 });
    assert.equal(s, once);
  });

  it('starts a save only once per exhibit', () => {
    let s = ready(boot());
    s = reducer(s, { type: 'SAVE_STARTED' });
    const once = s;
    assert.equal(reducer(s, { type: 'SAVE_STARTED' }), once);
  });

  it('does not repeat an exhibit after the run restarts', () => {
    const s = reducer(perfectRun(), { type: 'RESTART' });
    assert.deepEqual(s, initialState(SLICE));
  });
});

describe('skip and failed saves', () => {
  const ready = (s: GameState) =>
    [{ type: 'START_EDIT' }, { type: 'EDITOR_READY' }].reduce((a, x) => reducer(a, x as Action), s);

  it('syncs the exhibit unedited when skipped, and moves on to analysis', () => {
    let s = ready(boot());
    s = reducer(s, { type: 'SKIP' });
    assert.equal(s.phase, 'ANALYSIS');
    assert.equal(s.results.cctv!.unedited, true);
    assert.equal(heatOf(s.results), 100);
    assert.equal(suspicionOf(s.results), 0);
  });

  it('ignores a skip while a save is in flight, or once the exhibit is scored', () => {
    let s = ready(boot());
    s = reducer(s, { type: 'SAVE_STARTED' });
    assert.equal(reducer(s, { type: 'SKIP' }), s);
    s = reducer(s, { type: 'SAVE_SCORED', coverage: cov('cctv', { face: 1 }) });
    assert.equal(reducer(s, { type: 'SKIP' }), s, 'no second score');
  });

  it('lets the player try again after a failed save', () => {
    let s = ready(boot());
    s = reducer(s, { type: 'SAVE_STARTED' });
    s = reducer(s, { type: 'SAVE_FAILED' });
    assert.equal(s.saving, false);
    assert.equal(s.phase, 'EDIT');
    s = reducer(s, { type: 'SAVE_STARTED' });
    s = reducer(s, { type: 'SAVE_SCORED', coverage: cov('cctv', { face: 1 }) });
    assert.equal(s.phase, 'ANALYSIS');
  });

  it('ends the run if the clock ran out during a save that then failed', () => {
    let s = ready(boot());
    s = reducer(s, { type: 'SAVE_STARTED' });
    s = reducer(s, { type: 'TICK', ms: CLOCK_MS });
    s = reducer(s, { type: 'SAVE_FAILED' });
    assert.equal(s.phase, 'VERDICT');
    assert.equal(Object.keys(s.results).length, 3);
  });

  it('keeps a custom clock length across a restart', () => {
    const s = reducer(initialState(SLICE, 12_000), { type: 'RESTART' });
    assert.equal(s.clockMs, 12_000);
  });
});

describe('load-time frame checks', () => {
  const r = (x: number, w = 0.1) => ({ x, y: 0, w, h: 0.1 });
  const good = () => ({
    anpr: {
      targets: [
        { id: 'plate', rects: [r(0.5)] },
        { id: 'red-car', rects: [r(0), r(0.1), r(0.2), r(0.3)] },
      ],
      seals: [
        { id: 'timestamp', rects: [r(0.6)] },
        { id: 'unit-id', rects: [r(0.7)] },
      ],
    },
    witness: {
      targets: [{ id: 'red-car', rects: [r(0), r(0.1), r(0.2), r(0.3), r(0.5)] }],
      seals: [
        { id: 'geotag', rects: [r(0.6)] },
        { id: 'device-meta', rects: [r(0.7)] },
      ],
    },
  });

  it('accepts frames that match what the game assumes', () => {
    assert.deepEqual(validateFrames(good()), []);
  });

  it('flags a witness car whose rect count no longer matches the ANPR car', () => {
    const f = good();
    f.witness.targets[0].rects.pop();
    assert.match(validateFrames(f).join(), /witness red-car has 4 rects, expected 5/);
  });

  it('flags overlapping rects inside a group, which would double count', () => {
    const f = good();
    f.anpr.targets[1].rects[1] = r(0.05);
    assert.match(validateFrames(f).join(), /anpr\/red-car: rects 0 and 1 of one group overlap/);
  });

  it('flags region ids that differ from the spec', () => {
    const f = good();
    f.anpr.seals[0].id = 'renamed';
    assert.match(validateFrames(f).join(), /anpr: seals \[renamed,unit-id\] do not match/);
  });
});

describe('the full five-exhibit run', () => {
  const boot5 = () => reducer(initialState(SHIPPED), { type: 'BOOT_DONE' });
  const perfectFive = () => {
    let s = boot5();
    s = next(edit(s, cov('cctv', { face: 1, jacket: 1 })));
    s = next(edit(s, cov('anpr', { plate: 1, 'red-car': 1 })));
    s = next(edit(s, cov('report', { 'suspect-name': 1, 'vehicle-line': 1 })));
    s = next(edit(s, cov('broadcast', { 'headline-name': 1, 'strap-vehicle': 1 })));
    return next(edit(s, cov('witness', { 'red-car': FULL_CAR })));
  };

  it('plays all five in order with the witness photo last', () => {
    assert.deepEqual([...SHIPPED], ['cctv', 'anpr', 'report', 'broadcast', 'witness']);
  });

  it('uses the raw weights directly, so the car moves 13 heat', () => {
    const w = normalisedWeights(SHIPPED);
    near(
      Object.values(w).reduce((a, b) => a + b, 0),
      100,
      1e-9,
    );
    near(w[targetKey('anpr', 'red-car')], 13);
    near(w[targetKey('broadcast', 'headline-name')], 15);
    let s = boot5();
    s = next(edit(s, cov('cctv')));
    s = edit(s, cov('anpr', { 'red-car': 1 }));
    near(transferredToWitness(s.results), 13);
  });

  it('reaches zero heat and CLEAN SLATE on a perfect run', () => {
    const s = perfectFive();
    assert.equal(s.phase, 'VERDICT');
    near(heatOf(s.results), 0, 1e-9);
    assert.equal(s.ending?.kind, 'CLEAN_SLATE');
    assert.equal(Object.keys(s.results).length, 5);
  });

  it('keeps the transferred car heat when only the witness photo is left alone', () => {
    let s = boot5();
    s = next(edit(s, cov('cctv', { face: 1, jacket: 1 })));
    s = next(edit(s, cov('anpr', { plate: 1, 'red-car': 1 })));
    s = next(edit(s, cov('report', { 'suspect-name': 1, 'vehicle-line': 1 })));
    s = next(edit(s, cov('broadcast', { 'headline-name': 1, 'strap-vehicle': 1 })));
    s = next(edit(s, cov('witness')));
    near(heatOf(s.results), 13);
    assert.equal(s.ending?.kind, 'PARTIAL');
  });

  it('syncs all five unedited when the clock runs out', () => {
    let s = boot5();
    s = reducer(s, { type: 'START_EDIT' });
    s = reducer(s, { type: 'EDITOR_READY' });
    s = reducer(s, { type: 'TICK', ms: CLOCK_MS });
    assert.equal(s.phase, 'VERDICT');
    assert.equal(Object.keys(s.results).length, 5);
    assert.equal(heatOf(s.results), 100);
    assert.equal(s.ending?.kind, 'SYNCED');
  });

  it('charges seals on the new exhibits once each too', () => {
    const r = scoreExhibit(
      SHIPPED,
      'broadcast',
      cov('broadcast', {}, { 'channel-bug': 0.4, ticker: [0.3, 0.4] }),
      0,
    );
    assert.deepEqual(r.breached, ['channel-bug', 'ticker']);
    assert.equal(r.suspicionAdded, 60);
  });
});

describe('nothing changed', () => {
  const skipEverything = (): GameState => {
    let s = boot();
    for (let i = 0; i < SLICE.length; i++) {
      for (const a of [
        { type: 'START_EDIT' },
        { type: 'EDITOR_READY' },
        { type: 'SKIP' },
        { type: 'NEXT' },
      ] as Action[])
        s = reducer(s, a);
    }
    return s;
  };

  it('is SYNCED, six stars, when every exhibit is skipped without the clock running out', () => {
    const s = skipEverything();
    assert.equal(s.timedOut, false);
    assert.equal(heatOf(s.results), 100);
    assert.deepEqual(s.ending, { kind: 'SYNCED', stars: 6 });
  });

  it('is SYNCED when every exhibit is saved with no edits at all', () => {
    let s = boot();
    s = next(edit(s, cov('cctv')));
    s = next(edit(s, cov('anpr')));
    s = next(edit(s, cov('witness')));
    assert.equal(s.ending?.kind, 'SYNCED');
  });

  it('keeps six stars when only a seal was damaged and no heat came off', () => {
    let s = boot();
    s = next(edit(s, cov('cctv', {}, { timecode: 1 })));
    s = next(edit(s, cov('anpr')));
    s = next(edit(s, cov('witness')));
    assert.equal(heatOf(s.results), 100);
    assert.equal(suspicionOf(s.results), 30);
    assert.deepEqual(s.ending, { kind: 'SYNCED', stars: 6 });
  });

  it('stays a partial once the player has actually taken heat off', () => {
    let s = boot();
    s = next(edit(s, cov('cctv', { face: 1 })));
    s = next(edit(s, cov('anpr')));
    s = next(edit(s, cov('witness')));
    assert.equal(s.ending?.kind, 'PARTIAL');
    assert.ok(heatOf(s.results) < 100);
  });

  it('never lowers the wanted level when no heat came off, whatever the suspicion', () => {
    for (const suspicion of [0, 30, 60, 99]) {
      assert.deepEqual(resolveEnding(100, suspicion, false), { kind: 'SYNCED', stars: 6 });
    }
    // ...but a tampering charge still comes first
    assert.equal(resolveEnding(100, 100, false).kind, 'TAMPERING');
  });

  it('still needs heat above 60 to sync', () => {
    assert.equal(resolveEnding(60, 0, true).kind, 'PARTIAL');
  });
});
