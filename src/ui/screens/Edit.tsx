import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useRef, useState, type Dispatch } from 'react';
import type { Frame } from '../../frames/sensor';
import { EXHIBITS, coverageFromMeasurement, type ExhibitId } from '../../game/case';
import type { Action, GameState } from '../../game/reducer';
import { materialFor, sealMaterialFor } from '../../scoring/calibration';
import { measure, type Measurement } from '../../scoring/measure';
import { Editor } from '../Editor';
import { getEditorLoadError, loadPinnedEditor } from '../preloadEditor';
import { HANDLER } from '../copy';
import { Typed } from '../vice/motion-bits';

type Props = {
  exhibit: ExhibitId;
  frame: Frame;
  state: GameState;
  dispatch: Dispatch<Action>;
  /** Called with the measurement and saved image so ANALYSIS can show them. */
  onSaved: (exhibit: ExhibitId, m: Measurement, saved: string) => void;
};

/** Wait until the editor's canvas exists and has been sized, i.e. the image is actually mounted. */
function whenImageMounted(cb: () => void): () => void {
  let tries = 0;
  let stopped = false;
  const poll = () => {
    if (stopped) return;
    const c = document.querySelector('canvas.lower-canvas') as HTMLCanvasElement | null;
    if (c && c.width > 0 && c.height > 0) {
      // one more beat so the image has been drawn onto the canvas
      window.setTimeout(() => !stopped && cb(), 200);
    } else if (tries++ < 200) {
      window.setTimeout(poll, 50);
    }
  };
  poll();
  return () => {
    stopped = true;
  };
}

export default function Edit({ exhibit, frame, state, dispatch, onSaved }: Props) {
  const spec = EXHIBITS[exhibit];
  const savingRef = useRef(false);
  const cancelReady = useRef<() => void>(() => {});

  // The shared clock: ticks by real elapsed time. The reducer ignores ticks until the editor is ready.
  useEffect(() => {
    let last = performance.now();
    const id = window.setInterval(() => {
      const now = performance.now();
      dispatch({ type: 'TICK', ms: now - last });
      last = now;
    }, 250);
    return () => window.clearInterval(id);
  }, [dispatch]);

  useEffect(() => () => cancelReady.current(), []);

  const onLoad = useCallback(() => {
    cancelReady.current();
    cancelReady.current = whenImageMounted(() => dispatch({ type: 'EDITOR_READY' }));
  }, [dispatch]);

  const onSave = useCallback(
    async ({ dataUrl }: { dataUrl: string }) => {
      if (savingRef.current) return;
      savingRef.current = true;
      dispatch({ type: 'SAVE_STARTED' });
      try {
        const m = await measure(frame, dataUrl, materialFor(exhibit), sealMaterialFor(exhibit));
        onSaved(exhibit, m, dataUrl);
        dispatch({ type: 'SAVE_SCORED', coverage: coverageFromMeasurement(m) });
      } catch (e) {
        console.error('[game] could not score the save', e);
        dispatch({ type: 'SAVE_FAILED' });
      } finally {
        savingRef.current = false;
      }
    },
    [dispatch, exhibit, frame, onSaved],
  );

  const ready = state.editorReady;

  // Reliable loading: if the editor cannot open (blocked or slow CDN, a script error), say so and offer a way out
  // instead of leaving the player on a spinner. The clock stays held the whole time, so nothing is lost.
  const [attempt, setAttempt] = useState(0);
  const [problem, setProblem] = useState<string | null>(null);
  const readyRef = useRef(ready);
  readyRef.current = ready;
  const fail = useCallback((message: string) => {
    if (!readyRef.current) setProblem(message);
  }, []);
  // A known failure from boot (embed.js blocked or offline) is shown at once rather than after a long wait.
  useEffect(() => {
    if (getEditorLoadError() && !window.ImageEditor) {
      setProblem('The editor could not be reached. Check your connection.');
    }
  }, [attempt]);
  useEffect(() => {
    if (ready || problem) return;
    const id = window.setTimeout(
      () => setProblem('The editor is taking too long to open.'),
      20_000,
    );
    return () => window.clearTimeout(id);
  }, [ready, problem, attempt]);
  const retry = () => {
    setProblem(null);
    // Re-fetch through the pinned loader so a recovery cannot quietly change the editor version.
    loadPinnedEditor()
      .catch(() => {})
      .finally(() => setAttempt((n) => n + 1));
  };

  return (
    <div className="relative grid h-full min-h-0 grid-cols-[minmax(0,1fr)_350px] gap-3 p-3">
      <div className="bezel relative min-h-0 overflow-hidden">
        <Editor
          key={attempt}
          image={frame.dataUrl}
          minHeight="calc(100vh - 64px - 24px)"
          onLoad={onLoad}
          onSave={onSave}
          onCancel={() => dispatch({ type: 'SKIP' })}
          onLoadError={() => {
            console.error('[game] the image failed to load into the editor');
            fail('The evidence image could not be loaded into the editor.');
          }}
          onError={(e) => {
            console.error('[game] editor error', e);
            fail('The editor could not be reached. Check your connection.');
          }}
        />

        {/* until the editor has really mounted, the clock is not running and we say so */}
        <AnimatePresence>
          {!ready && (
            <motion.div
              key="loading"
              className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-[#06070b]/90 p-6 text-center"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.4 } }}
            >
              {problem ? (
                <div className="card max-w-md p-6">
                  <div className="text-xl font-bold text-white">Couldn&apos;t open this file</div>
                  <p className="mt-2 text-[15px] leading-relaxed text-white/80">{problem}</p>
                  <p className="mt-1 text-[14px] text-white/60">
                    Your clock is still held. Try again, or leave this exhibit as it is.
                  </p>
                  <div className="mt-5 flex justify-center gap-3">
                    <button
                      type="button"
                      className="btn-primary px-6 py-2.5 text-base"
                      onClick={retry}
                    >
                      Try again
                    </button>
                    <button
                      type="button"
                      className="btn-ghost text-[15px]"
                      onClick={() => dispatch({ type: 'SKIP' })}
                    >
                      Skip this exhibit
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="text-2xl font-bold text-white">Opening file</div>
                  <div className="h-1 w-56 overflow-hidden rounded-full bg-white/12">
                    <motion.div
                      className="h-full w-1/3 rounded-full bg-neon"
                      animate={{ x: ['-100%', '300%'] }}
                      transition={{ duration: 1.1, repeat: Infinity, ease: 'linear' }}
                    />
                  </div>
                  <div className="text-[14px] text-white/70">
                    Your clock is held until the file is open
                  </div>
                </>
              )}
            </motion.div>
          )}
          {state.saving && (
            <motion.div
              key="saving"
              className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-[#06070b]/85"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="text-2xl font-bold text-white">Writing to server</div>
              <div className="text-[14px] text-white/70">Comparing against the original…</div>
              <div className="h-1 w-64 overflow-hidden rounded-full bg-white/12">
                <motion.div
                  className="h-full w-1/3 rounded-full bg-pink"
                  animate={{ x: ['-100%', '300%'] }}
                  transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* handler comms */}
      <aside className="card flex min-h-0 flex-col gap-4 overflow-y-auto p-4">
        <div>
          <div className="text-[12.5px] tracking-[0.14em] text-neon">
            EXHIBIT {String(spec.number).padStart(2, '0')}
          </div>
          <div className="font-display text-2xl leading-tight neon-pink">{spec.title}</div>
        </div>

        <div className="border-l-2 border-gold pl-3 text-[14.5px] leading-relaxed text-white/85">
          <div className="mb-1 text-[12.5px] tracking-[0.14em] text-gold">HANDLER</div>
          <Typed text={HANDLER[exhibit].extra ?? HANDLER[exhibit].line} speed={12} delay={400} />
        </div>

        <div>
          <div className="mb-1 text-[12.5px] tracking-[0.14em] text-[#ffb347]">CONCEAL</div>
          <div className="flex flex-wrap gap-1.5">
            {spec.targets.map((t) => (
              <span
                key={t.id}
                className="rounded-md border border-[#ffb347]/60 bg-[#ffb347]/10 px-2.5 py-1 text-[13.5px] text-[#ffb347]"
              >
                {t.id}
              </span>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-1 text-[12.5px] tracking-[0.14em] text-neon">DO NOT TOUCH</div>
          <div className="flex flex-wrap gap-1.5">
            {spec.seals.map((s) => (
              <span
                key={s}
                className="rounded-md border border-neon/60 bg-neon/10 px-2.5 py-1 text-[13.5px] text-neon"
              >
                {s}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-pink/50 bg-pink/10 p-3 text-[14px] leading-snug text-pink">
          <span className="mr-1 text-[12.5px] tracking-[0.12em]">RULE</span>
          Cover it opaquely. See-through edits will not hold.
        </div>

        <div className="mt-auto text-[13px] leading-relaxed text-white/65">
          Press <span className="text-white/80">COMMIT TO FILE</span> when you are done. It counts
          as your only save for this exhibit. <span className="text-white/84">Cancel</span> leaves
          the file as it is.
        </div>
      </aside>
    </div>
  );
}
