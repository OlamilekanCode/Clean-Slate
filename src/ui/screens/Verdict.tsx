import { motion } from 'motion/react';
import { EXHIBITS, type ExhibitId } from '../../game/case';
import type { Ending, Results } from '../../game/reducer';
import { VERDICT_COPY } from '../copy';
import ViceBackdrop from '../vice/ViceBackdrop';
import { AnimatedNumber, SirenEdges, Typed, WantedStars } from '../vice/motion-bits';

type Props = {
  ending: Ending;
  results: Results;
  shipped: readonly ExhibitId[];
  heat: number;
  suspicion: number;
  timedOut: boolean;
  onRestart: () => void;
};

const TONE = {
  CLEAN_SLATE: { cls: 'neon-cyan', accent: '#2de2e6', tint: 'rgba(45,226,230,0.10)' },
  TAMPERING: { cls: 'neon-pink', accent: '#ff3b4e', tint: 'rgba(255,59,78,0.20)' },
  SYNCED: { cls: 'neon-sun', accent: '#ff9a3c', tint: 'rgba(255,154,60,0.10)' },
  PARTIAL: { cls: 'neon-pink', accent: '#ff2d95', tint: 'rgba(255,45,149,0.08)' },
} as const;

export default function Verdict({
  ending,
  results,
  shipped,
  heat,
  suspicion,
  timedOut,
  onRestart,
}: Props) {
  const copy = VERDICT_COPY[ending.kind];
  const tone = TONE[ending.kind];
  const short = typeof window !== 'undefined' && window.innerHeight < 820;
  const narrow = typeof window !== 'undefined' && window.innerWidth < 480;

  return (
    <div className="relative h-full w-full overflow-hidden">
      <ViceBackdrop mode="full" />
      <div
        className="pointer-events-none absolute inset-0 z-[1]"
        style={{ background: tone.tint }}
      />
      <SirenEdges intensity={ending.kind === 'TAMPERING' ? 1 : 0} />

      <div
        className={`relative z-10 mx-auto flex h-full max-w-[1200px] flex-col items-center overflow-y-auto overflow-x-hidden px-4 sm:px-6 [&>:first-child]:mt-auto [&>:last-child]:mb-auto ${short ? 'gap-2.5 py-3' : 'gap-5 py-6'}`}
      >
        {/* title slam */}
        <motion.div
          className="text-center"
          initial={{ scale: 2.4, opacity: 0, filter: 'blur(18px)' }}
          animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
          transition={{ type: 'spring', stiffness: 130, damping: 14 }}
        >
          <div className="mb-1 text-[13.5px] tracking-[0.22em]" style={{ color: tone.accent }}>
            {timedOut ? 'CLOCK EXPIRED · ' : ''}CASE 26-4471 · RESULT
          </div>
          <h1
            className={`font-display leading-[0.92] ${tone.cls}`}
            style={{
              fontSize: `clamp(40px, min(${copy.title.length > 12 ? 7.2 : 11}vw, ${short ? (copy.title.length > 12 ? 10 : 13) : copy.title.length > 12 ? 12 : 16}vh), ${copy.title.length > 12 ? 108 : 150}px)`,
            }}
          >
            {(() => {
              // Words stay whole (no mid-word wrapping); letters still animate in one by one.
              let n = 0;
              return copy.title.split(' ').map((word, w) => (
                <span key={w} className="inline-block whitespace-nowrap">
                  {word.split('').map((c) => {
                    const i = n++;
                    return (
                      <motion.span
                        key={i}
                        className="inline-block"
                        initial={{ y: 60, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{
                          delay: 0.15 + i * 0.045,
                          type: 'spring',
                          stiffness: 300,
                          damping: 16,
                        }}
                      >
                        {c}
                      </motion.span>
                    );
                  })}
                  {w < copy.title.split(' ').length - 1 && (
                    <span className="inline-block w-[0.28em]" />
                  )}
                </span>
              ));
            })()}
          </h1>
        </motion.div>

        {/* wanted stars */}
        <motion.div
          className={`card flex flex-col items-center gap-1 ${narrow ? 'px-4' : 'px-8'} ${short ? 'py-2' : 'py-4'}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
        >
          <WantedStars level={ending.stars} size={narrow ? 36 : short ? 34 : 54} />
          <div className="text-[13.5px] tracking-[0.2em] text-white/78">
            {ending.stars === 0 ? 'NOT WANTED' : `WANTED LEVEL ${ending.stars}`}
          </div>
        </motion.div>

        <div className={`card max-w-[720px] px-7 text-center ${short ? 'py-2' : 'py-4'}`}>
          <div className="font-display text-2xl text-white">
            <Typed text={copy.sub} speed={26} delay={1300} cursor={false} />
          </div>
          <motion.p
            className="mt-2 text-[16px] leading-relaxed text-white/75"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2.2 }}
          >
            {copy.body}
          </motion.p>
        </div>

        {/* recap */}
        <motion.div
          className={`card w-full max-w-[860px] ${short ? 'p-3' : 'p-5'}`}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.4, duration: 0.6 }}
        >
          <div className="mb-2 grid grid-cols-[1fr_5rem_6.5rem] gap-x-2 sm:grid-cols-[1fr_7rem_7rem_8rem] sm:gap-x-4 text-[12.5px] tracking-[0.14em] text-white/65">
            <span>FILE</span>
            <span className="text-right">HEAT CUT</span>
            <span className="text-right">STAMPS HIT</span>
            <span className="hidden text-right sm:block">STATUS</span>
          </div>
          {shipped.map((id, i) => {
            const r = results[id];
            const removed = r ? r.targets.reduce((s, t) => s + t.heatRemoved, 0) : 0;
            return (
              <motion.div
                key={id}
                className={`grid grid-cols-[1fr_5rem_6.5rem] items-baseline gap-x-2 sm:grid-cols-[1fr_7rem_7rem_8rem] sm:gap-x-4 border-t border-white/10 ${short ? 'py-0.5' : 'py-1.5'} text-[15px]`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 2.6 + i * 0.15 }}
              >
                <span className="text-white">
                  <span className="mr-2 text-pink">
                    {String(EXHIBITS[id].number).padStart(2, '0')}
                  </span>
                  {EXHIBITS[id].title}
                </span>
                <span className="text-right text-neon">
                  {removed > 0 ? `−${removed.toFixed(1)}` : '0'}
                </span>
                <span
                  className={`text-right ${r && r.breached.length ? 'text-breach' : 'text-white/78'}`}
                >
                  {r ? r.breached.length : 0}
                </span>
                <span className="hidden text-right text-[13.5px] tracking-[0.1em] text-white/72 sm:block">
                  {!r ? 'NOT REACHED' : r.unedited ? 'UNTOUCHED' : 'CHANGED'}
                </span>
              </motion.div>
            );
          })}
          <div className="mt-2 grid grid-cols-2 gap-6 border-t border-white/25 pt-3">
            <div>
              <div className="text-[12px] tracking-[0.14em] text-white/70">FINAL HEAT</div>
              <AnimatedNumber
                value={heat}
                duration={1.6}
                className={`font-display neon-pink ${short ? 'text-4xl' : 'text-5xl'}`}
              />
            </div>
            <div>
              <div className="text-[12px] tracking-[0.14em] text-white/70">SUSPICION</div>
              <AnimatedNumber
                value={suspicion}
                duration={1.6}
                className={`font-display ${short ? 'text-4xl' : 'text-5xl'} ${suspicion >= 40 ? 'text-breach' : 'neon-cyan'}`}
              />
            </div>
          </div>
        </motion.div>

        <motion.button
          type="button"
          onClick={onRestart}
          className={`btn-primary px-12 text-xl ${short ? 'py-2.5' : 'py-4'}`}
          style={{ boxShadow: '0 0 28px rgba(255,45,149,0.55)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 3.4 }}
          whileHover={{ scale: 1.07 }}
          whileTap={{ scale: 0.95 }}
        >
          RUN IT AGAIN
        </motion.button>
      </div>
    </div>
  );
}
