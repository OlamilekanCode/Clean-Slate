import { motion } from 'motion/react';
import { useEffect, useRef } from 'react';
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

/**
 * The persistent HUD: exhibit counter, clock, wanted stars with heat, and suspicion.
 * One row on a laptop; on a phone or tablet it folds into two rows so nothing is pushed off the screen.
 * It publishes its own height as --hud-h so the screens below can fill the rest without magic numbers.
 */
export default function Chrome({ index, total, clockMs, running, heat, suspicion }: Props) {
  const low = clockMs <= 60_000;
  const critical = clockMs <= 20_000;
  const clockClass = critical ? 'neon-pink' : low ? 'neon-sun' : 'neon-cyan';
  const risk = Math.min(100, suspicion);

  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const publish = () =>
      document.documentElement.style.setProperty('--hud-h', `${el.offsetHeight}px`);
    publish();
    const ro = new ResizeObserver(publish);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <header
      ref={ref}
      className="relative z-40 flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-b border-white/10 bg-[#07090c]/80 px-3 py-2 backdrop-blur-xl sm:px-4 lg:h-[64px] lg:flex-nowrap lg:gap-x-4 lg:px-4 xl:gap-x-5 xl:px-5 lg:py-0"
    >
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px"
        style={{ background: 'linear-gradient(90deg, #ff2d95, #ffd166, #2de2e6)' }}
      />

      {/* wordmark */}
      <div className="font-display text-[20px] leading-none tracking-wide sm:text-[23px] lg:text-[25px]">
        <span className="neon-cyan">CLEAN</span>
        <span className="mx-1 text-pink">/</span>
        <span className="neon-pink">SLATE</span>
      </div>

      {/* clock: sits top-right on small screens, and after the counter on a laptop */}
      <div className="order-2 ml-auto flex flex-col items-end leading-none lg:order-3">
        <span className="mb-1 text-[11px] tracking-[0.1em] text-white/70 sm:text-[12px]">
          {running ? 'CLOCK RUNNING' : 'CLOCK PAUSED'}
        </span>
        <span
          className={`font-display text-[28px] tabular-nums sm:text-[32px] lg:text-[36px] ${clockClass} ${critical && running ? 'blip' : ''}`}
          style={{ opacity: running ? 1 : 0.6 }}
        >
          {formatClock(clockMs)}
        </span>
      </div>

      {/* second row on small screens; on a laptop this wrapper disappears and the items join the main row */}
      <div className="order-3 flex w-full items-center gap-2.5 sm:gap-5 lg:contents">
        {/* exhibit counter */}
        <div className="flex items-center gap-2 whitespace-nowrap text-[12px] tracking-[0.1em] text-white/78 lg:order-2 lg:mr-auto lg:text-[13.5px]">
          <span className="hidden sm:inline">EXHIBIT</span>
          <span className="text-sm text-white">
            {String(Math.min(index + 1, total)).padStart(2, '0')}/{String(total).padStart(2, '0')}
          </span>
          <div className="flex gap-1">
            {Array.from({ length: total }, (_, i) => (
              <motion.span
                key={i}
                className="block h-[6px] w-3 rounded-full sm:w-6 lg:w-5 xl:w-8"
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

        <div className="hidden h-8 w-px bg-white/15 lg:order-4 lg:block" />

        {/* heat */}
        <div className="flex shrink-0 flex-col gap-1 lg:order-5 lg:min-w-[150px] xl:min-w-[170px]">
          <div className="flex items-center justify-between gap-3 text-[11px] tracking-[0.1em] text-white/70 sm:text-[12px] lg:gap-4">
            <span>WANTED</span>
            <span className="text-white">
              HEAT <AnimatedNumber value={heat} />
            </span>
          </div>
          <WantedStars level={wantedLevel(heat)} size={15} />
        </div>

        <div className="hidden h-8 w-px bg-white/15 lg:order-6 lg:block" />

        {/* suspicion */}
        <div className="min-w-0 flex-1 lg:order-7 lg:w-[170px] lg:flex-none xl:w-[220px]">
          <div className="mb-1 flex items-center justify-between gap-2 text-[11px] tracking-[0.1em] text-white/70 sm:text-[12px]">
            <span>SUSPICION</span>
            <span className={risk >= 40 ? 'text-breach' : 'text-white'}>
              <AnimatedNumber value={risk} />
            </span>
          </div>
          <div className="relative h-[8px] overflow-hidden rounded-full bg-white/12">
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
      </div>
    </header>
  );
}
