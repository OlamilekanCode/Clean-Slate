import { motion } from 'motion/react';
import { useMemo } from 'react';
import { EXHIBITS, type ExhibitId } from '../../game/case';
import type { Frame } from '../../frames/sensor';
import { CLOCK_RULE, HANDLER, RULES, TOOLS_LINE } from '../copy';
import Outlines, { type Outline } from '../Outlines';
import ViceBackdrop from '../vice/ViceBackdrop';
import { Typed } from '../vice/motion-bits';

const TONE: Record<string, string> = {
  amber: 'border-warn text-warn',
  cyan: 'border-neon text-neon',
  pink: 'border-pink text-pink',
  red: 'border-breach text-breach',
};

type Props = {
  exhibit: ExhibitId;
  /** Null while the frame is still being generated. */
  frame: Frame | null;
  isFirst: boolean;
  onOpen: () => void;
};

export default function Brief({ exhibit, frame, isFirst, onOpen }: Props) {
  const spec = EXHIBITS[exhibit];
  const handler = HANDLER[exhibit];
  const isChain = exhibit === 'anpr' || exhibit === 'witness';

  const outlines = useMemo<Outline[]>(() => {
    if (!frame) return [];
    const list: Outline[] = [];
    frame.targets.forEach((t, i) =>
      list.push({
        id: t.id,
        rects: t.rects,
        color: '#ffb347',
        label: `CONCEAL · ${t.id}`,
        delay: 0.9 + i * 0.25,
        dashed: true,
      }),
    );
    frame.seals.forEach((s, i) =>
      list.push({
        id: s.id,
        rects: s.rects,
        color: '#2de2e6',
        label: `SEAL · ${s.id}`,
        delay: 1.2 + i * 0.25,
        dashed: true,
      }),
    );
    return list;
  }, [frame]);

  return (
    <div className="relative h-full w-full overflow-hidden">
      <ViceBackdrop mode="dim" />
      <div className="relative z-10 mx-auto grid h-full max-w-[1500px] grid-cols-1 gap-6 overflow-y-auto px-6 py-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        {/* mission card */}
        <div className="flex flex-col justify-center gap-4">
          <div className="relative">
            <motion.div
              className="font-display absolute -left-2 -top-6 select-none text-[clamp(90px,13vw,190px)] leading-none text-transparent"
              style={{ WebkitTextStroke: '2px rgba(255,45,149,0.55)' }}
              initial={{ x: -120, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 120, damping: 16 }}
            >
              {String(spec.number).padStart(2, '0')}
            </motion.div>
            <div className="relative pt-[clamp(44px,6.6vw,96px)]">
              <motion.div
                className="text-[11px] tracking-[0.45em] text-neon"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                EXHIBIT {String(spec.number).padStart(2, '0')} · ROUTING TO ANALYST
              </motion.div>
              <motion.h2
                className="font-display mt-1 text-[clamp(34px,4.8vw,68px)] leading-[0.95] neon-pink"
                initial={{ clipPath: 'inset(0 100% 0 0)', x: -30 }}
                animate={{ clipPath: 'inset(0 0% 0 0)', x: 0 }}
                transition={{ duration: 0.7, delay: 0.35, ease: [0.7, 0, 0.2, 1] }}
              >
                {spec.title}
              </motion.h2>
            </div>
          </div>

          <div className="border-l-2 border-gold bg-black/60 p-4 text-[14px] leading-relaxed text-white/90 backdrop-blur-sm">
            <span className="mr-2 text-[11px] tracking-[0.3em] text-gold">HANDLER</span>
            <Typed text={handler.line} speed={11} delay={500} />
          </div>

          {handler.extra && (
            <motion.div
              className={`border p-3 text-[13px] leading-relaxed ${isChain ? 'border-pink/70 bg-pink/10 text-pink' : 'border-white/20 text-white/70'}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.4 }}
            >
              {isChain && (
                <span className="mr-2 text-[11px] tracking-[0.3em]">LINKED EVIDENCE</span>
              )}
              {handler.extra}
            </motion.div>
          )}

          {isFirst ? (
            <motion.div
              className="space-y-2"
              initial="hidden"
              animate="show"
              variants={{ show: { transition: { staggerChildren: 0.12, delayChildren: 1.2 } } }}
            >
              <div className="grid grid-cols-2 gap-2">
                {RULES.map((r) => (
                  <motion.div
                    key={r.tag}
                    className="flex flex-col gap-1 bg-black/60 p-2 text-[12px] leading-snug backdrop-blur-sm"
                    variants={{ hidden: { opacity: 0, x: -24 }, show: { opacity: 1, x: 0 } }}
                  >
                    <span
                      className={`border-l-2 pl-2 text-[11px] tracking-[0.18em] ${TONE[r.tone]}`}
                    >
                      {r.tag}
                    </span>
                    <span className="text-white/80">{r.text}</span>
                  </motion.div>
                ))}
              </div>
              <motion.p
                variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }}
                className="text-[12px] text-gold"
              >
                {CLOCK_RULE}
              </motion.p>
              <motion.p
                variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }}
                className="text-[11.5px] text-white/50"
              >
                {TOOLS_LINE}
              </motion.p>
            </motion.div>
          ) : (
            <p className="text-[12.5px] text-white/60">
              <span className="mr-2 text-pink">REMINDER</span>
              Cover targets opaquely. Leave every seal alone.
            </p>
          )}

          <motion.button
            type="button"
            onClick={onOpen}
            disabled={!frame}
            className="font-display sticky bottom-2 z-20 mt-1 w-fit border-2 border-neon bg-black/80 px-9 py-3 text-xl tracking-[0.22em] text-white disabled:opacity-40"
            style={{
              boxShadow: '0 0 24px rgba(45,226,230,0.45), inset 0 0 16px rgba(45,226,230,0.2)',
            }}
            whileHover={{ scale: 1.06, boxShadow: '0 0 44px rgba(45,226,230,0.9)' }}
            whileTap={{ scale: 0.96 }}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: isFirst ? 2.2 : 1.2 }}
          >
            {frame ? 'OPEN FILE' : 'DECRYPTING…'}
          </motion.button>
        </div>

        {/* the evidence, with what to conceal and what to leave alone */}
        <motion.div
          className="bezel relative h-fit self-center px-3 pb-8 pt-7"
          initial={{ opacity: 0, x: 60, rotateY: 12 }}
          animate={{ opacity: 1, x: 0, rotateY: 0 }}
          transition={{ duration: 0.8, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
          style={{ transformPerspective: 1200 }}
        >
          <div className="absolute left-3 top-2 z-10 text-[10px] tracking-[0.3em] text-white/50">
            {frame ? `${frame.W}×${frame.H} · ${spec.title.toUpperCase()}` : 'GENERATING'}
          </div>
          {frame ? (
            <Outlines
              src={frame.dataUrl}
              W={frame.W}
              H={frame.H}
              outlines={outlines}
              className="mx-auto max-h-[64vh] w-full"
            />
          ) : (
            <div className="blip text-neon">DECRYPTING EXHIBIT…</div>
          )}
          <div className="absolute bottom-2 left-3 z-10 flex gap-4 text-[10px] tracking-[0.2em]">
            <span className="text-[#ffb347]">▮ CONCEAL</span>
            <span className="text-neon">▮ DO NOT TOUCH</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
