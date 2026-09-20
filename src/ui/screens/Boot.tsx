import { motion } from 'motion/react';
import { useState } from 'react';
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
  const linesDone = line >= BOOT_LINES.length;

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

      <div className="relative z-10 flex h-full flex-col items-center justify-center gap-7 px-6">
        {/* title */}
        <div className="text-center">
          <motion.div
            className="mb-2 text-[11px] tracking-[0.5em] text-neon"
            initial={{ opacity: 0, letterSpacing: '1.4em' }}
            animate={{ opacity: 1, letterSpacing: '0.5em' }}
            transition={{ duration: 1.2, delay: 0.1 }}
          >
            LEONIDA STATE POLICE · EVIDENCE TERMINAL
          </motion.div>
          <h1
            className="font-display glitch text-[clamp(64px,13vw,168px)] leading-[0.9]"
            data-text="CLEAN SLATE"
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
          className="w-[min(92vw,860px)] border border-neon/40 bg-black/70 p-5 backdrop-blur-sm"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 1.1 }}
          style={{ boxShadow: '0 0 40px rgba(45,226,230,0.15), inset 0 0 30px rgba(0,0,0,0.6)' }}
        >
          <div className="mb-3 flex items-center gap-2 text-[10px] tracking-[0.3em] text-white/45">
            <span className="blip inline-block h-2 w-2 rounded-full bg-breach" />
            UNREGISTERED DEVICE · LINK ESTABLISHED
          </div>
          <div className="min-h-[136px] space-y-1 text-[13px] leading-relaxed text-sys glow-cyan">
            {BOOT_LINES.slice(0, line + 1).map((l, i) => (
              <div key={i}>
                <span className="text-pink">&gt; </span>
                {i === line ? (
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
            <div className="mt-4 border-t border-white/15 pt-3 text-[13px] leading-relaxed text-white/90">
              <span className="mr-2 text-gold">HANDLER</span>
              <Typed text={BOOT_HANDLER} speed={14} onDone={() => setHandlerDone(true)} />
            </div>
          )}
        </motion.div>

        {/* trigger */}
        <motion.button
          type="button"
          onClick={trigger}
          disabled={!handlerDone || alarm}
          className="font-display relative border-2 border-pink bg-black/60 px-10 py-3 text-2xl tracking-[0.25em] text-white disabled:opacity-0"
          style={{
            boxShadow: '0 0 26px rgba(255,45,149,0.6), inset 0 0 18px rgba(255,45,149,0.3)',
          }}
          animate={
            handlerDone && !alarm
              ? {
                  scale: [1, 1.045, 1],
                  boxShadow: [
                    '0 0 18px rgba(255,45,149,0.5)',
                    '0 0 46px rgba(255,45,149,0.95)',
                    '0 0 18px rgba(255,45,149,0.5)',
                  ],
                }
              : {}
          }
          transition={{ duration: 1.3, repeat: Infinity }}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.96 }}
        >
          {alarm ? 'ALARM TRIPPED' : 'TRIGGER ALARM'}
        </motion.button>
      </div>
    </div>
  );
}
