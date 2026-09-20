import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useRef, type Dispatch } from 'react';
import type { Frame } from '../../frames/sensor';
import { EXHIBITS, coverageFromMeasurement, type ExhibitId } from '../../game/case';
import type { Action, GameState } from '../../game/reducer';
import { materialFor, sealMaterialFor } from '../../scoring/calibration';
import { measure, type Measurement } from '../../scoring/measure';
import { Editor } from '../Editor';
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

  return (
    <div className="relative grid h-full min-h-0 grid-cols-[minmax(0,1fr)_300px] gap-3 p-3">
      <div className="bezel relative min-h-0 overflow-hidden">
        <Editor
          image={frame.dataUrl}
          minHeight="calc(100vh - 58px - 26px - 24px)"
          onLoad={onLoad}
          onSave={onSave}
          onCancel={() => dispatch({ type: 'SKIP' })}
          onLoadError={() => console.error('[game] the image failed to load into the editor')}
          onError={(e) => console.error('[game] editor error', e)}
        />

        {/* until the editor has really mounted, the clock is not running and we say so */}
        <AnimatePresence>
          {!ready && (
            <motion.div
              key="loading"
              className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-black/80"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.5 } }}
            >
              <div className="font-display text-3xl neon-cyan">OPENING FILE</div>
              <div className="h-[3px] w-56 overflow-hidden bg-white/10">
                <motion.div
                  className="h-full w-1/3 bg-neon"
                  animate={{ x: ['-100%', '300%'] }}
                  transition={{ duration: 1.1, repeat: Infinity, ease: 'linear' }}
                />
              </div>
              <div className="text-[11px] tracking-[0.25em] text-white/50">
                CLOCK HELD UNTIL THE FILE IS OPEN
              </div>
            </motion.div>
          )}
          {state.saving && (
            <motion.div
              key="saving"
              className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-black/75"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="font-display text-4xl neon-pink">WRITING TO SERVER</div>
              <div className="text-[11px] tracking-[0.3em] text-white/60">
                COMPARING AGAINST ORIGINAL…
              </div>
              <motion.div
                className="h-[2px] w-72 bg-pink"
                animate={{ scaleX: [0.1, 1, 0.1], opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 0.9, repeat: Infinity }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* handler comms */}
      <aside className="flex min-h-0 flex-col gap-3 overflow-y-auto border border-white/10 bg-black/60 p-3 backdrop-blur-sm">
        <div>
          <div className="text-[10px] tracking-[0.3em] text-neon">
            EXHIBIT {String(spec.number).padStart(2, '0')}
          </div>
          <div className="font-display text-2xl leading-tight neon-pink">{spec.title}</div>
        </div>

        <div className="border-l-2 border-gold pl-3 text-[12.5px] leading-relaxed text-white/85">
          <div className="mb-1 text-[10px] tracking-[0.3em] text-gold">HANDLER</div>
          <Typed text={HANDLER[exhibit].extra ?? HANDLER[exhibit].line} speed={12} delay={400} />
        </div>

        <div>
          <div className="mb-1 text-[10px] tracking-[0.3em] text-[#ffb347]">CONCEAL</div>
          <div className="flex flex-wrap gap-1.5">
            {spec.targets.map((t) => (
              <span
                key={t.id}
                className="border border-[#ffb347]/70 bg-[#ffb347]/10 px-2 py-0.5 text-[11px] text-[#ffb347]"
              >
                {t.id}
              </span>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-1 text-[10px] tracking-[0.3em] text-neon">DO NOT TOUCH</div>
          <div className="flex flex-wrap gap-1.5">
            {spec.seals.map((s) => (
              <span
                key={s}
                className="border border-neon/70 bg-neon/10 px-2 py-0.5 text-[11px] text-neon"
              >
                {s}
              </span>
            ))}
          </div>
        </div>

        <div className="border border-pink/60 bg-pink/10 p-2 text-[12px] leading-snug text-pink">
          <span className="mr-1 text-[10px] tracking-[0.25em]">RULE</span>
          Cover it opaquely. See-through edits will not hold.
        </div>

        <div className="mt-auto text-[10.5px] leading-relaxed text-white/45">
          Press <span className="text-white/80">COMMIT TO FILE</span> when you are done. It counts
          as your only save for this exhibit. <span className="text-white/70">Cancel</span> leaves
          the file as it is.
        </div>
      </aside>
    </div>
  );
}
