import { animate, AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';

const reduced = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Types text out one character at a time. Handler text arrives like a message on a stolen laptop. */
export function Typed({
  text,
  speed = 18,
  delay = 0,
  onDone,
  className = '',
  cursor = true,
}: {
  text: string;
  speed?: number;
  delay?: number;
  onDone?: () => void;
  className?: string;
  cursor?: boolean;
}) {
  const [n, setN] = useState(reduced() ? text.length : 0);
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    if (reduced()) {
      setN(text.length);
      done.current?.();
      return;
    }
    setN(0);
    let i = 0;
    let id: ReturnType<typeof setInterval>;
    const start = setTimeout(() => {
      id = setInterval(() => {
        i += 1;
        setN(i);
        if (i >= text.length) {
          clearInterval(id);
          done.current?.();
        }
      }, speed);
    }, delay);
    return () => {
      clearTimeout(start);
      clearInterval(id);
    };
  }, [text, speed, delay]);
  return (
    <span className={`${className} ${cursor && n < text.length ? 'caret' : ''}`}>
      {text.slice(0, n)}
    </span>
  );
}

/** A number that eases to its new value instead of jumping. */
export function AnimatedNumber({
  value,
  digits = 0,
  duration = 0.9,
  className = '',
}: {
  value: number;
  digits?: number;
  duration?: number;
  className?: string;
}) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    if (reduced()) {
      setShown(value);
      from.current = value;
      return;
    }
    const controls = animate(from.current, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        from.current = v;
        setShown(v);
      },
    });
    return () => controls.stop();
  }, [value, duration]);
  return <span className={className}>{shown.toFixed(digits)}</span>;
}

/** Six stars, like the wanted-level HUD. `level` is how many are lit; new stars pop in, lit ones glint. */
export function WantedStars({
  level,
  size = 22,
  className = '',
}: {
  level: number;
  size?: number;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center gap-1 ${className}`}
      aria-label={`Wanted level ${level} of 6`}
    >
      {Array.from({ length: 6 }, (_, i) => {
        const lit = i < level;
        return (
          <div key={i} style={{ width: size, height: size }} className="relative">
            <svg viewBox="0 0 24 24" width={size} height={size} className="absolute inset-0">
              <path
                d="M12 1.8l3.1 6.6 7.2.9-5.3 5 1.4 7.2L12 17.9l-6.4 3.6L7 14.3 1.7 9.3l7.2-.9z"
                fill="none"
                stroke="rgba(255,255,255,0.22)"
                strokeWidth="1.2"
              />
            </svg>
            <AnimatePresence>
              {lit && (
                <motion.svg
                  key="lit"
                  viewBox="0 0 24 24"
                  width={size}
                  height={size}
                  className="absolute inset-0"
                  style={{
                    animation: `star-glint ${1.6 + (i % 3) * 0.3}s ease-in-out ${i * 0.15}s infinite`,
                  }}
                  initial={{ scale: 0, rotate: -90, opacity: 0 }}
                  animate={{ scale: 1, rotate: 0, opacity: 1 }}
                  exit={{ scale: 0, rotate: 120, opacity: 0, transition: { duration: 0.35 } }}
                  transition={{ type: 'spring', stiffness: 420, damping: 14, delay: i * 0.05 }}
                >
                  <path
                    d="M12 1.8l3.1 6.6 7.2.9-5.3 5 1.4 7.2L12 17.9l-6.4 3.6L7 14.3 1.7 9.3l7.2-.9z"
                    fill="#ffd166"
                    stroke="#fff3c4"
                    strokeWidth="0.8"
                  />
                </motion.svg>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

/** Red and blue lights along the screen edges, alternating like a patrol car. Intensity 0..1. */
export function SirenEdges({ intensity }: { intensity: number }) {
  if (intensity <= 0.01) return null;
  const side = (color: string, anim: string, pos: 'left' | 'right') => (
    <div
      className="absolute top-0 bottom-0 w-[9vw] max-w-[140px]"
      style={{
        [pos]: 0,
        opacity: intensity,
        background: `linear-gradient(to ${pos === 'left' ? 'right' : 'left'}, ${color}, transparent)`,
        animation: `${anim} ${1.1 - intensity * 0.5}s linear infinite`,
        mixBlendMode: 'screen',
      }}
    />
  );
  return (
    <div className="pointer-events-none fixed inset-0 z-50" aria-hidden>
      {side('rgba(255,59,78,0.55)', 'siren-red', 'left')}
      {side('rgba(59,107,255,0.55)', 'siren-blue', 'right')}
    </div>
  );
}

/** Diagonal neon slats that sweep across the screen whenever the scene changes. */
export function Wipe({ sceneKey }: { sceneKey: string }) {
  const bars = [
    { c: '#ff2d95', d: 0 },
    { c: '#2de2e6', d: 0.06 },
    { c: '#ffd166', d: 0.12 },
    { c: '#1a0833', d: 0.18 },
  ];
  return (
    <div
      key={sceneKey}
      className="pointer-events-none fixed inset-0 z-[55] overflow-hidden"
      aria-hidden
    >
      {bars.map((b) => (
        <motion.div
          key={b.c}
          className="absolute -inset-y-10 -left-[20%] w-[140%]"
          style={{ background: b.c, transformOrigin: '0% 50%', skewX: '-14deg' }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: [0, 1, 1], x: ['0%', '0%', '105%'] }}
          transition={{ duration: 0.75, delay: b.d, times: [0, 0.45, 1], ease: [0.7, 0, 0.2, 1] }}
        />
      ))}
    </div>
  );
}

/** Scrolling radio-style ticker. Invented station, invented copy. */
export function Ticker({ items, className = '' }: { items: string[]; className?: string }) {
  const line = items.join('   ◆   ');
  return (
    <div className={`overflow-hidden whitespace-nowrap ${className}`}>
      <div className="inline-block" style={{ animation: 'marquee 38s linear infinite' }}>
        <span className="pr-16">{line}</span>
        <span className="pr-16">{line}</span>
      </div>
    </div>
  );
}
