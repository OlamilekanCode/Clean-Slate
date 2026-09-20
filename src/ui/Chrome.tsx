import { motion } from 'motion/react';
import { AnimatedNumber, WantedStars } from './vice/motion-bits';

export const wantedLevel = (heat: number): number =>
  heat <= 5 ? 0 : Math.min(6, Math.ceil((heat / 100) * 6 - 1e-9));

function formatClock(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

type Props = {
  /** 0-based position of the current exhibit, and how many are in the run. */
  index: number;
  total: number;
  clockMs: number;
  /** True only while the clock is actually running. */
  running: boolean;
  heat: number;
  suspicion: number;
};

/** The persistent HUD: exhibit counter, clock, wanted stars with heat, and tampering risk. */
export default function Chrome({ index, total, clockMs, running, heat, suspicion }: Props) {
  const low = clockMs <= 60_000;
  const critical = clockMs <= 20_000;
  const clockClass = critical ? 'neon-pink' : low ? 'neon-sun' : 'neon-cyan';
  const risk = Math.min(100, suspicion);

  return (
    <header className="relative z-40 flex h-[58px] shrink-0 items-center gap-5 border-b border-pink/30 bg-black/70 px-4 backdrop-blur-sm">
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px"
        style={{ background: 'linear-gradient(90deg, #ff2d95, #ffd166, #2de2e6)' }}
      />

      {/* wordmark */}
      <div className="font-display text-[22px] leading-none tracking-wide">
        <span className="neon-cyan">CLEAN</span>
        <span className="mx-1 text-pink">/</span>
        <span className="neon-pink">SLATE</span>
      </div>

      {/* exhibit counter */}
      <div className="flex items-center gap-2 text-[11px] tracking-[0.2em] text-white/60">
        <span>EXHIBIT</span>
        <span className="text-sm text-white">
          {String(Math.min(index + 1, total)).padStart(2, '0')} / {String(total).padStart(2, '0')}
        </span>
        <div className="ml-1 flex gap-1">
          {Array.from({ length: total }, (_, i) => (
            <motion.span
              key={i}
              className="block h-[6px] w-7 skew-x-[-20deg]"
              animate={{
                backgroundColor:
                  i < index ? '#2de2e6' : i === index ? '#ff2d95' : 'rgba(255,255,255,0.16)',
                boxShadow:
                  i === index
                    ? '0 0 10px #ff2d95'
                    : i < index
                      ? '0 0 8px #2de2e6'
                      : '0 0 0 transparent',
              }}
              transition={{ duration: 0.5 }}
            />
          ))}
        </div>
      </div>

      <div className="flex-1" />

      {/* clock */}
      <div className="flex flex-col items-end leading-none">
        <span className="mb-1 text-[9px] tracking-[0.3em] text-white/50">
          {running ? 'CLOCK RUNNING' : 'CLOCK PAUSED'}
        </span>
        <span
          className={`font-display text-[30px] tabular-nums ${clockClass} ${critical && running ? 'blip' : ''}`}
          style={{ opacity: running ? 1 : 0.6 }}
        >
          {formatClock(clockMs)}
        </span>
      </div>

      <div className="h-8 w-px bg-white/15" />

      {/* heat */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between text-[9px] tracking-[0.3em] text-white/50">
          <span>WANTED</span>
          <span className="text-white">
            HEAT <AnimatedNumber value={heat} />
          </span>
        </div>
        <WantedStars level={wantedLevel(heat)} size={18} />
      </div>

      <div className="h-8 w-px bg-white/15" />

      {/* suspicion */}
      <div className="w-[190px]">
        <div className="mb-1 flex items-center justify-between text-[9px] tracking-[0.3em] text-white/50">
          <span>TAMPERING RISK</span>
          <span className={risk >= 40 ? 'text-breach' : 'text-white'}>
            <AnimatedNumber value={risk} />
          </span>
        </div>
        <div className="relative h-[10px] border border-white/25 bg-black/60">
          <motion.div
            className="absolute inset-y-0 left-0"
            style={{ background: 'linear-gradient(90deg, #2de2e6, #ffd166 55%, #ff3b4e)' }}
            animate={{ width: `${risk}%` }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          />
          {/* the 40 mark: at or above it, CLEAN SLATE is off the table */}
          <span className="absolute inset-y-[-3px] left-[40%] w-px bg-white/70" />
        </div>
      </div>
    </header>
  );
}
