import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { GENS } from './frames/evidence';
import type { Frame } from './frames/sensor';
import { EXHIBITS, SHIPPED, validateFrames, type ExhibitId } from './game/case';
import { heatOf, initialState, reducer, suspicionOf, type Results } from './game/reducer';
import type { Measurement } from './scoring/measure';
import Chrome from './ui/Chrome';
import { TICKER } from './ui/copy';
import Tracer from './ui/Tracer';
import Analysis from './ui/screens/Analysis';
import Boot from './ui/screens/Boot';
import Brief from './ui/screens/Brief';
import Edit from './ui/screens/Edit';
import Verdict from './ui/screens/Verdict';
import { SirenEdges, Ticker, Wipe } from './ui/vice/motion-bits';

type Frames = Partial<Record<ExhibitId, Frame>>;

const idle = (fn: () => void) => {
  const ric = (window as { requestIdleCallback?: typeof requestIdleCallback }).requestIdleCallback;
  return ric ? ric(fn, { timeout: 400 }) : window.setTimeout(fn, 0);
};

/**
 * Generate the first exhibit straight away and the rest during idle time. Each frame is generated exactly once
 * per run and that exact instance is held: every score is measured against the image the player was given.
 */
function useFrames(runId: number): Frames {
  const [frames, setFrames] = useState<Frames>({});
  useEffect(() => {
    let cancelled = false;
    setFrames({});
    const make = (i: number) => {
      if (cancelled || i >= SHIPPED.length) return;
      const id = SHIPPED[i];
      const frame = GENS[EXHIBITS[id].generator]();
      if (cancelled) return;
      setFrames((prev) => ({ ...prev, [id]: frame }));
      idle(() => make(i + 1));
    };
    make(0);
    return () => {
      cancelled = true;
    };
  }, [runId]);

  useEffect(() => {
    if (SHIPPED.every((id) => frames[id])) {
      const problems = validateFrames(
        Object.fromEntries(
          SHIPPED.map((id) => [id, { targets: frames[id]!.targets, seals: frames[id]!.seals }]),
        ),
      );
      if (problems.length)
        console.error('[game] generated frames do not match the game rules:', problems);
    }
  }, [frames]);
  return frames;
}

/** `?frame=N` or `?tracer` opens the calibration harness instead of the game. */
export default function App() {
  const params = new URLSearchParams(location.search);
  if (params.has('frame') || params.has('tracer')) return <Tracer />;
  return <Game />;
}

function Game() {
  // ?clock=SECONDS shortens the run clock, which is how the timeout path gets exercised.
  const clockSeconds = Number(new URLSearchParams(location.search).get('clock'));
  const [state, dispatch] = useReducer(reducer, undefined, () =>
    initialState(SHIPPED, clockSeconds > 0 ? clockSeconds * 1000 : undefined),
  );
  const [runId, setRunId] = useState(0);
  const frames = useFrames(runId);
  const [measurements, setMeasurements] = useState<
    Partial<Record<ExhibitId, { m: Measurement; saved: string }>>
  >({});
  const [revealed, setRevealed] = useState(false);
  const firstScene = useRef(true);

  // Read-only handle for tests and debugging (the calibration harness exposes the same kind of hook).
  useEffect(() => {
    (window as unknown as Record<string, unknown>).__game = { frames, state };
  });

  const current = state.shipped[state.index];
  const sceneKey = `${state.phase}-${state.index}`;

  useEffect(() => setRevealed(false), [sceneKey]);
  useEffect(() => {
    firstScene.current = false;
  }, []);

  const onSaved = useCallback((exhibit: ExhibitId, m: Measurement, saved: string) => {
    setMeasurements((prev) => ({ ...prev, [exhibit]: { m, saved } }));
  }, []);

  const restart = useCallback(() => {
    dispatch({ type: 'RESTART' });
    setMeasurements({});
    setRunId((n) => n + 1);
  }, []);

  // While the analysis is still revealing, the meters show the state from before this exhibit, so the change
  // lands with the reveal instead of ahead of it.
  const withoutCurrent = useMemo<Results>(() => {
    const rest = { ...state.results };
    delete rest[current];
    return rest;
  }, [state.results, current]);
  const shownResults = state.phase === 'ANALYSIS' && !revealed ? withoutCurrent : state.results;
  const heat = heatOf(shownResults);
  const suspicion = suspicionOf(shownResults);

  const running = state.phase === 'EDIT' && state.editorReady && !state.timedOut;
  const showChrome =
    state.phase === 'BRIEF' || state.phase === 'EDIT' || state.phase === 'ANALYSIS';

  let siren = 0;
  if (showChrome) {
    if (running && state.clockMs <= 20_000) siren = 0.85;
    else if (running && state.clockMs <= 60_000) siren = 0.35;
    if (suspicion >= 70) siren = Math.max(siren, 0.5);
    else if (suspicion >= 40) siren = Math.max(siren, 0.25);
  }

  const frame = frames[current] ?? null;

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-bg">
      {showChrome && (
        <Chrome
          index={state.index}
          total={state.shipped.length}
          clockMs={state.clockMs}
          running={running}
          heat={heat}
          suspicion={suspicion}
        />
      )}

      <main className="relative min-h-0 flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={sceneKey}
            className="absolute inset-0"
            initial={{ opacity: 0, scale: 1.03, filter: 'blur(6px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
            transition={{
              duration: 0.5,
              delay: firstScene.current ? 0 : 0.28,
              ease: [0.16, 1, 0.3, 1],
            }}
          >
            {state.phase === 'BOOT' && <Boot onTrigger={() => dispatch({ type: 'BOOT_DONE' })} />}

            {state.phase === 'BRIEF' && (
              <Brief
                exhibit={current}
                frame={frame}
                isFirst={state.index === 0}
                onOpen={() => dispatch({ type: 'START_EDIT' })}
              />
            )}

            {state.phase === 'EDIT' && frame && (
              <Edit
                exhibit={current}
                frame={frame}
                state={state}
                dispatch={dispatch}
                onSaved={onSaved}
              />
            )}

            {state.phase === 'ANALYSIS' && frame && state.results[current] && (
              <Analysis
                exhibit={current}
                frame={frame}
                result={state.results[current]!}
                measurement={measurements[current]}
                before={{ heat: heatOf(withoutCurrent), suspicion: suspicionOf(withoutCurrent) }}
                after={{ heat: heatOf(state.results), suspicion: suspicionOf(state.results) }}
                isLast={state.index + 1 >= state.shipped.length}
                timedOut={state.timedOut}
                onRevealed={() => setRevealed(true)}
                onNext={() => dispatch({ type: 'NEXT' })}
              />
            )}

            {state.phase === 'VERDICT' && state.ending && (
              <Verdict
                ending={state.ending}
                results={state.results}
                shipped={state.shipped}
                heat={heatOf(state.results)}
                suspicion={suspicionOf(state.results)}
                timedOut={state.timedOut}
                onRestart={restart}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {showChrome && (
        <Ticker
          items={TICKER}
          className="relative z-40 h-[26px] shrink-0 border-t border-white/10 bg-black/80 text-[10px] leading-[26px] tracking-[0.25em] text-white/45"
        />
      )}

      <SirenEdges intensity={siren} />
      {!firstScene.current && <Wipe sceneKey={sceneKey} />}
      <div className="crt" aria-hidden />
    </div>
  );
}
