import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import type { Frame } from '../../frames/sensor';
import { EXHIBITS, groupsOf, type ExhibitId, type ExhibitResult } from '../../game/case';
import type { Measurement } from '../../scoring/measure';
import { BREACH_COVER, BREACH_SUSPICION, groupCover } from '../../scoring/score';
import { coverageVerdict } from '../copy';
import Outlines, { type Outline } from '../Outlines';
import ViceBackdrop from '../vice/ViceBackdrop';
import { AnimatedNumber } from '../vice/motion-bits';

type Tone = 'good' | 'warn' | 'bad' | 'dim';
const TONE_COLOR: Record<Tone, string> = {
  good: '#2de2e6',
  warn: '#ffb347',
  bad: '#ff3b4e',
  dim: '#7a8a96',
};

type Row = {
  key: string;
  kind: string;
  title: string;
  verdict: string;
  detail: string;
  tone: Tone;
  outline?: { rects: Frame['targets'][number]['rects']; label: string };
};

type Props = {
  exhibit: ExhibitId;
  frame: Frame;
  result: ExhibitResult;
  measurement?: { m: Measurement; saved: string };
  before: { heat: number; suspicion: number };
  after: { heat: number; suspicion: number };
  isLast: boolean;
  timedOut: boolean;
  onRevealed: () => void;
  onNext: () => void;
};

const START = 0.7;

export default function Analysis(props: Props) {
  const [fast, setFast] = useState(false);
  return (
    <AnalysisBody
      key={fast ? 'fast' : 'slow'}
      {...props}
      fast={fast}
      onSkip={() => setFast(true)}
    />
  );
}

function AnalysisBody({
  exhibit,
  frame,
  result,
  measurement,
  before,
  after,
  isLast,
  timedOut,
  onRevealed,
  onNext,
  fast,
  onSkip,
}: Props & { fast: boolean; onSkip: () => void }) {
  const spec = EXHIBITS[exhibit];
  const step = fast ? 0.1 : 0.95;
  const [shown, setShown] = useState(0);
  const [done, setDone] = useState(false);

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    const regionOf = (id: string, kind: 'target' | 'seal') =>
      measurement?.m.regions.find((r) => r.id === id && r.kind === kind);
    const rectsOf = (id: string, list: Frame['targets']) =>
      list.find((t) => t.id === id)?.rects ?? [];

    if (result.unedited) {
      out.push({
        key: 'unedited',
        kind: 'FILE',
        title: 'NOTHING SAVED',
        verdict: 'LEFT AS IT WAS',
        detail: 'Every target on this file keeps its full heat.',
        tone: 'bad',
      });
    }

    for (const t of result.targets) {
      const region = regionOf(t.id, 'target');
      // cover of the weakest group: that is the one that limits the credit
      const groups = region ? groupsOf(exhibit, t.id, region.parts) : [];
      const covers = groups.map((g) => groupCover(g));
      const cover = covers.length ? Math.min(...covers) : 0;
      const v = coverageVerdict(cover);
      const groupNote =
        covers.length > 1
          ? `body ${Math.round(covers[0] * 100)}% · plate ${Math.round(covers[1] * 100)}%`
          : '';
      let heatNote: string;
      if (t.transferred > 0) heatNote = `${t.transferred.toFixed(1)} heat moves to Exhibit 05`;
      else if (t.heatRemoved > 0) heatNote = `−${t.heatRemoved.toFixed(1)} heat`;
      else if (t.weight === 0 && exhibit === 'witness') heatNote = 'nothing was transferred here';
      else heatNote = 'no heat removed';
      out.push({
        key: `t-${t.id}`,
        kind: 'HIDE IT',
        title: t.id.replace(/-/g, ' '),
        verdict: t.credit >= 0.999 ? 'HIDDEN' : v.label,
        detail: [groupNote || v.detail, heatNote].join(' · '),
        tone: t.credit >= 0.999 ? 'good' : t.credit > 0 ? 'warn' : 'bad',
        outline: {
          rects: rectsOf(t.id, frame.targets),
          label: `${t.id.replace(/-/g, ' ').toUpperCase()} · ${cover >= 0.75 ? Math.round(cover * 100) : Math.floor(cover * 100)}%`,
        },
      });
    }

    if (!result.unedited) {
      for (const s of spec.seals) {
        const region = regionOf(s, 'seal');
        const cover = region?.cover ?? 0;
        const breached = result.breached.includes(s);
        out.push({
          key: `s-${s}`,
          kind: 'HANDS OFF',
          title: s.replace(/-/g, ' '),
          verdict: breached ? 'TAMPERED' : cover > 0.004 ? 'SCRATCHED · LET SLIDE' : 'UNTOUCHED',
          detail: breached
            ? `${(cover * 100).toFixed(1)}% changed · over the ${BREACH_COVER * 100}% line · +${BREACH_SUSPICION} suspicion`
            : `${(cover * 100).toFixed(1)}% changed`,
          tone: breached ? 'bad' : cover > 0.004 ? 'warn' : 'good',
          outline: {
            rects: rectsOf(s, frame.seals),
            label: `${s.replace(/-/g, ' ').toUpperCase()} · ${breached ? 'TAMPERED' : 'OK'}`,
          },
        });
      }
      const col = result.collateral;
      out.push({
        key: 'collateral',
        kind: 'REST OF THE SHOT',
        title: 'collateral',
        verdict: result.collateralSuspicion > 0 ? 'TOO MUCH' : 'CLEAN',
        detail:
          result.collateralSuspicion > 0
            ? `${(col * 100).toFixed(1)}% of the rest of the shot changed · +${result.collateralSuspicion.toFixed(0)} suspicion`
            : `${(col * 100).toFixed(1)}% of the rest of the shot changed`,
        tone: result.collateralSuspicion > 0 ? 'bad' : 'good',
      });
    }

    const car = result.targets.find((t) => t.id === 'red-car');
    if (exhibit === 'anpr' && car && car.transferred > 0) {
      out.push({
        key: 'link',
        kind: 'LINK',
        title: 'linked evidence',
        verdict: 'HEAT MOVED',
        detail: `LINKED EVIDENCE: ${car.transferred.toFixed(0)} points transferred to Exhibit 05. Clear the witness photo to remove them.`,
        tone: 'warn',
      });
    }
    if (exhibit === 'witness' && car && car.weight > 0) {
      out.push({
        key: 'link',
        kind: 'LINK',
        title: 'linked evidence',
        verdict: car.credit >= 0.999 ? 'CLEARED' : 'STILL THERE',
        detail: `${car.weight.toFixed(0)} points arrived from Exhibit 02${
          car.credit >= 0.999
            ? ' and you removed all of them.'
            : `; you removed ${car.heatRemoved.toFixed(0)} of them.`
        }`,
        tone: car.credit >= 0.999 ? 'good' : 'warn',
      });
    }
    return out;
  }, [exhibit, frame, measurement, result, spec.seals]);

  useEffect(() => {
    setShown(0);
    setDone(false);
    const timers: number[] = [];
    rows.forEach((_, i) =>
      timers.push(window.setTimeout(() => setShown(i + 1), (START + i * step) * 1000)),
    );
    timers.push(
      window.setTimeout(
        () => {
          setDone(true);
          onRevealed();
        },
        (START + rows.length * step + 0.5) * 1000,
      ),
    );
    return () => timers.forEach(clearTimeout);
    // rows is stable for this mount; onRevealed is intentionally not a dependency
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, step]);

  const outlines = useMemo<Outline[]>(() => {
    const list: Outline[] = [];
    rows.forEach((r, i) => {
      if (!r.outline) return;
      list.push({
        id: r.key,
        rects: r.outline.rects,
        color: TONE_COLOR[r.tone],
        label: r.outline.label,
        delay: START + i * step,
        fill: true,
      });
    });
    return list;
  }, [rows, step]);

  return (
    <div className="relative h-full w-full overflow-x-hidden overflow-y-auto lg:overflow-hidden">
      <ViceBackdrop mode="dim" />
      <div className="relative z-10 grid min-h-full grid-cols-1 gap-4 p-3 sm:p-4 lg:h-full lg:min-h-0 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <motion.div
          className="bezel relative h-fit self-start px-3 pb-3 pt-7 lg:self-center"
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="absolute left-3 top-2 z-10 text-[12.5px] tracking-[0.14em] text-white/70">
            {measurement ? 'FILE AS YOU SAVED IT' : 'FILE AS IT WAS'}
          </div>
          <Outlines
            src={measurement?.saved ?? frame.dataUrl}
            W={frame.W}
            H={frame.H}
            outlines={outlines}
            className="mx-auto max-h-[50dvh] w-full lg:max-h-[calc(100dvh-190px)]"
          />
        </motion.div>

        <div className="flex min-h-0 flex-col gap-3 lg:overflow-y-auto">
          <div>
            <div className="text-[12.5px] tracking-[0.2em] text-neon">
              EXHIBIT {String(spec.number).padStart(2, '0')} · WHAT THEY WOULD FIND
            </div>
            <motion.h2
              className="font-display text-[clamp(30px,4vw,54px)] leading-none neon-pink"
              initial={{ x: -40, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 160, damping: 16 }}
            >
              {spec.title}
            </motion.h2>
          </div>

          {timedOut && (
            <div className="border border-breach bg-breach/10 p-2 text-[14px] text-breach">
              CLOCK EXPIRED. Your save landed first. Everything left goes to the archive as it is.
            </div>
          )}

          <div className="space-y-2">
            <AnimatePresence>
              {rows.slice(0, shown).map((r) => (
                <motion.div
                  key={r.key}
                  className="card relative overflow-hidden p-3.5"
                  style={{ borderColor: `${TONE_COLOR[r.tone]}88` }}
                  initial={{ opacity: 0, x: 60, skewX: -8 }}
                  animate={{ opacity: 1, x: 0, skewX: 0 }}
                  transition={{ type: 'spring', stiffness: 220, damping: 20 }}
                >
                  <motion.span
                    className="absolute inset-y-0 left-0 w-[3px]"
                    style={{
                      background: TONE_COLOR[r.tone],
                      boxShadow: `0 0 12px ${TONE_COLOR[r.tone]}`,
                    }}
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{ duration: 0.4 }}
                  />
                  <div className="flex items-baseline justify-between gap-3 pl-2">
                    <div className="flex items-baseline gap-2">
                      <span className="text-[12px] tracking-[0.14em] text-white/65">{r.kind}</span>
                      <span className="text-[15px] font-bold uppercase text-white">{r.title}</span>
                    </div>
                    <span
                      className="font-display text-[22px] leading-none"
                      style={{
                        color: TONE_COLOR[r.tone],
                        textShadow: `0 0 12px ${TONE_COLOR[r.tone]}`,
                      }}
                    >
                      {r.verdict}
                    </span>
                  </div>
                  <div className="mt-1 pl-2 text-[14px] leading-snug text-white/80">{r.detail}</div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* what it did to the meters */}
          <AnimatePresence>
            {done && (
              <motion.div
                className="card mt-1 grid grid-cols-2 gap-3 p-4"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Meter label="HEAT" from={before.heat} to={after.heat} good="down" />
                <Meter label="SUSPICION" from={before.suspicion} to={after.suspicion} good="down" />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="sticky bottom-0 z-20 -mx-3 mt-auto flex items-center gap-4 bg-bg/90 px-3 pb-3 pt-3 backdrop-blur sm:-mx-4 sm:px-4 lg:mx-0 lg:px-0 lg:pb-2">
            <motion.button
              type="button"
              onClick={onNext}
              disabled={!done}
              className="btn-primary flex-1 px-9 py-3.5 text-lg sm:flex-none"
              style={{ boxShadow: '0 0 24px rgba(45,226,230,0.4)' }}
              whileHover={done ? { scale: 1.06 } : {}}
              whileTap={done ? { scale: 0.96 } : {}}
            >
              {isLast || timedOut ? 'SEE HOW IT ENDED' : 'NEXT FILE'}
            </motion.button>
            {!done && (
              <button
                type="button"
                onClick={onSkip}
                className="text-[13.5px] tracking-[0.12em] text-white/70 underline"
              >
                SKIP REVEAL
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Meter({
  label,
  from,
  to,
  good,
}: {
  label: string;
  from: number;
  to: number;
  good: 'down' | 'up';
}) {
  const delta = to - from;
  const better = good === 'down' ? delta < -0.05 : delta > 0.05;
  const worse = good === 'down' ? delta > 0.05 : delta < -0.05;
  return (
    <div>
      <div className="text-[12px] tracking-[0.14em] text-white/70">{label}</div>
      <div className="flex items-baseline gap-2">
        <span className="font-display text-3xl text-white/65 line-through decoration-white/25">
          {Math.round(from)}
        </span>
        <span className="text-white/60">→</span>
        <AnimatedNumber
          value={to}
          duration={1.1}
          className={`font-display text-4xl ${better ? 'neon-cyan' : worse ? 'text-breach' : 'text-white'}`}
        />
        <span
          className={`text-[14px] ${better ? 'text-neon' : worse ? 'text-breach' : 'text-white/70'}`}
        >
          {Math.abs(delta) < 0.05
            ? 'no change'
            : `${delta > 0 ? '+' : '−'}${Math.abs(delta).toFixed(1)}`}
        </span>
      </div>
    </div>
  );
}
