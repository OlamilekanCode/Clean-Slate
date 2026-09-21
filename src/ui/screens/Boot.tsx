import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { BOOT_HANDLER, BOOT_LINES } from '../copy';
import ViceBackdrop from '../vice/ViceBackdrop';
import { SirenEdges, Typed } from '../vice/motion-bits';

const WORD_A = 'CLEAN'.split('');
const WORD_B = 'SLATE'.split('');

function Letter({ ch, i, tone }: { ch: string; i: number; tone: 'pink' | 'cyan' }) {
  return (
    <motion.span
      className={`inline-block ${tone === 'pink' ? 'neon-pink' : 'neon-cyan'}`}
      initial={{ y: 90, opacity: 0, rotateX: -80, skewX: -14 }}
      animate={{ y: 0, opacity: 1, rotateX: 0, skewX: -8 }}
      transition={{ type: 'spring', stiffness: 260, damping: 15, delay: 0.25 + i * 0.07 }}
    >
      {ch}
    </motion.span>
  );
}

export default function Boot({ onTrigger }: { onTrigger: () => void }) {
  const [line, setLine] = useState(0);
  const [handlerDone, setHandlerDone] = useState(false);
  const [alarm, setAlarm] = useState(false);
  // The intro can be skipped (button or Enter), so nobody has to wait through the typing.
  const [skipped, setSkipped] = useState(false);
  const linesDone = skipped || line >= BOOT_LINES.length;
  const ready = skipped || handlerDone;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Enter' && setSkipped(true);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const trigger = () => {
    if (alarm) return;
    setAlarm(true);
    window.setTimeout(onTrigger, 1100);
  };

  return (
    <div className={`relative h-full w-full overflow-hidden ${alarm ? 'shake' : ''}`}>
      <ViceBackdrop mode="full" />
      <SirenEdges intensity={alarm ? 1 : 0} />
      {alarm && (
        <motion.div
          className="pointer-events-none absolute inset-0 z-30 bg-breach"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.55, 0, 0.4, 0] }}
          transition={{ duration: 1, times: [0, 0.1, 0.3, 0.45, 1] }}
        />
      )}

      <div className="relative z-10 flex h-full flex-col items-center gap-5 overflow-y-auto px-4 py-5 sm:gap-7 sm:px-6 [&>:first-child]:mt-auto [&>:last-child]:mb-auto">
        {/* title */}
        <div className="text-center">
          <motion.div
            className="mb-2 text-[13.5px] tracking-[0.22em] text-neon"
            initial={{ opacity: 0, letterSpacing: '1.4em' }}
            animate={{ opacity: 1, letterSpacing: '0.5em' }}
            transition={{ duration: 1.2, delay: 0.1 }}
          >
            LEONIDA STATE POLICE · EVIDENCE SERVER
          </motion.div>
          <h1
            className="font-display text-[clamp(64px,13vw,168px)] leading-[0.9]"
            style={{ perspective: 600 }}
          >
            {WORD_A.map((c, i) => (
              <Letter key={i} ch={c} i={i} tone="cyan" />
            ))}
            <span className="inline-block w-[0.28em]" />
            {WORD_B.map((c, i) => (
              <Letter key={i} ch={c} i={i + 5} tone="pink" />
            ))}
          </h1>
          <motion.div
            className="mx-auto mt-3 h-[3px] w-[min(70vw,720px)]"
            style={{
              background:
                'linear-gradient(90deg, transparent, #ff2d95, #ffd166, #2de2e6, transparent)',
            }}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 1, delay: 1 }}
          />
        </div>

        {/* terminal */}
        <motion.div
          className="card w-[min(92vw,860px)] p-4 sm:p-6"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 1.1 }}
          style={{ boxShadow: '0 0 40px rgba(45,226,230,0.15), inset 0 0 30px rgba(0,0,0,0.6)' }}
        >
          <div className="mb-3 flex items-center gap-2 text-[12.5px] tracking-[0.14em] text-white/65">
            <span className="blip inline-block h-2 w-2 rounded-full bg-breach" />
            STOLEN LAPTOP · YOU ARE IN
          </div>
          <div className="min-h-[136px] space-y-1 text-[15px] leading-relaxed text-sys">
            {BOOT_LINES.slice(0, skipped ? BOOT_LINES.length : line + 1).map((l, i) => (
              <div key={i}>
                <span className="text-pink">&gt; </span>
                {i === line && !skipped ? (
                  <Typed
                    text={l}
                    speed={10}
                    delay={i === 0 ? 1500 : 120}
                    onDone={() => setLine((n) => n + 1)}
                  />
                ) : (
                  l
                )}
              </div>
            ))}
          </div>
          {linesDone && (
            <div className="mt-4 border-t border-white/15 pt-3 text-[15px] leading-relaxed text-white/90">
              <span className="mr-2 text-gold">HANDLER</span>
              {skipped ? (
                BOOT_HANDLER
              ) : (
                <Typed text={BOOT_HANDLER} speed={14} onDone={() => setHandlerDone(true)} />
              )}
            </div>
          )}
        </motion.div>

        {!ready && (
          <button
            type="button"
            onClick={() => setSkipped(true)}
            className="btn-ghost -mt-3 px-4 py-1.5 text-[14px]"
          >
            Skip intro <span className="ml-2 text-white/60">Enter</span>
          </button>
        )}

        {/* trigger */}
        <motion.button
          type="button"
          onClick={trigger}
          disabled={!ready || alarm}
          className="btn-primary px-12 py-4 text-xl"
          initial={false}
          animate={{ opacity: ready ? 1 : 0, y: ready ? 0 : 12 }}
          style={{ pointerEvents: ready ? 'auto' : 'none' }}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
        >
          {alarm ? 'Alarm tripped' : 'Trip the alarm'}
        </motion.button>
      </div>
    </div>
  );
}
