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

  return (
    <div className="relative h-full w-full overflow-hidden">
      <ViceBackdrop mode="full" />
      <div
        className="pointer-events-none absolute inset-0 z-[1]"
        style={{ background: tone.tint }}
      />
      <SirenEdges intensity={ending.kind === 'TAMPERING' ? 1 : 0} />

      <div className="relative z-10 mx-auto flex h-full max-w-[1200px] flex-col items-center justify-center gap-5 overflow-y-auto px-6 py-6">
        {/* title slam */}
        <motion.div
          className="text-center"
          initial={{ scale: 2.4, opacity: 0, filter: 'blur(18px)' }}
          animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
          transition={{ type: 'spring', stiffness: 130, damping: 14 }}
        >
          <div className="mb-1 text-[11px] tracking-[0.5em]" style={{ color: tone.accent }}>
            {timedOut ? 'CLOCK EXPIRED · ' : ''}CASE 26-4471 · VERDICT
          </div>
          <h1
            className={`font-display glitch leading-[0.92] ${tone.cls}`}
            data-text={copy.title}
            style={{
              fontSize: `clamp(40px, ${copy.title.length > 12 ? 7.2 : 11}vw, ${copy.title.length > 12 ? 108 : 150}px)`,
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
          className="flex flex-col items-center gap-1 bg-black/45 px-8 py-3 backdrop-blur-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
        >
          <WantedStars level={ending.stars} size={54} />
          <div className="text-[11px] tracking-[0.4em] text-white/60">
            {ending.stars === 0 ? 'NOT WANTED' : `WANTED LEVEL ${ending.stars}`}
          </div>
        </motion.div>

        <div className="max-w-[720px] bg-black/45 px-6 py-3 text-center backdrop-blur-sm">
          <div className="font-display text-2xl text-white">
            <Typed text={copy.sub} speed={26} delay={1300} cursor={false} />
          </div>
          <motion.p
            className="mt-2 text-[14px] leading-relaxed text-white/75"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2.2 }}
          >
            {copy.body}
          </motion.p>
        </div>

        {/* recap */}
        <motion.div
          className="w-full max-w-[860px] border border-white/20 bg-black/70 p-4 backdrop-blur-sm"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.4, duration: 0.6 }}
        >
          <div className="mb-2 grid grid-cols-[1fr_auto_auto_auto] gap-x-6 text-[10px] tracking-[0.3em] text-white/45">
            <span>EXHIBIT</span>
            <span className="text-right">HEAT REMOVED</span>
            <span className="text-right">SEALS BREACHED</span>
            <span className="text-right">STATE</span>
          </div>
          {shipped.map((id, i) => {
            const r = results[id];
            const removed = r ? r.targets.reduce((s, t) => s + t.heatRemoved, 0) : 0;
            return (
              <motion.div
                key={id}
                className="grid grid-cols-[1fr_auto_auto_auto] items-baseline gap-x-6 border-t border-white/10 py-1.5 text-[13px]"
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
                  className={`text-right ${r && r.breached.length ? 'text-breach' : 'text-white/60'}`}
                >
                  {r ? r.breached.length : 0}
                </span>
                <span className="text-right text-[11px] tracking-[0.15em] text-white/55">
                  {!r ? 'NOT REACHED' : r.unedited ? 'UNEDITED' : 'EDITED'}
                </span>
              </motion.div>
            );
          })}
          <div className="mt-2 grid grid-cols-2 gap-6 border-t border-white/25 pt-3">
            <div>
              <div className="text-[9px] tracking-[0.3em] text-white/50">FINAL HEAT</div>
              <AnimatedNumber
                value={heat}
                duration={1.6}
                className="font-display text-5xl neon-pink"
              />
            </div>
            <div>
              <div className="text-[9px] tracking-[0.3em] text-white/50">TAMPERING RISK</div>
              <AnimatedNumber
                value={suspicion}
                duration={1.6}
                className={`font-display text-5xl ${suspicion >= 40 ? 'text-breach' : 'neon-cyan'}`}
              />
            </div>
          </div>
        </motion.div>

        <motion.button
          type="button"
          onClick={onRestart}
          className="font-display border-2 border-pink bg-black/70 px-10 py-3 text-2xl tracking-[0.25em] text-white"
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
