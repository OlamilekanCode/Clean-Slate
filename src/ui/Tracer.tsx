import { useEffect, useRef, useState } from 'react';
import type { ImageEditorRef } from '@unlayer/react-image-editor';
import { GENS } from '../frames/evidence';
import { UNTOUCHED_FLOOR } from '../scoring/calibration';
import { measure } from '../scoring/measure';
import type { Measurement } from '../scoring/measure';
import { syntheticSave } from '../scoring/selftest';
import type { SyntheticKind } from '../scoring/selftest';
import { Editor } from './Editor';

type Entry = { label: string; m: Measurement };

/** `?frame=1..5` picks the exhibit, so the export noise floor can be measured on every frame type. */
const FRAME_INDEX =
  Math.min(
    GENS.length,
    Math.max(1, Number(new URLSearchParams(location.search).get('frame')) || 1),
  ) - 1;

const pct = (n: number) => (n * 100).toFixed(1) + '%';

/** Throwaway harness for the tracer bullet: mount editor, save, log format, measure baseline, prove scoring. */
export default function Tracer() {
  // Generated exactly once: every score is measured against the instance the player was actually given.
  const [frame] = useState(() => GENS[FRAME_INDEX]());
  const editorRef = useRef<ImageEditorRef>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loadedMs, setLoadedMs] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const t0 = useRef(performance.now());

  const push = (label: string, m: Measurement) => {
    console.info(`[tracer] ${label}`, m);
    setEntries((e) => [{ label, m }, ...e]);
  };

  const runSynthetic = async (kind: SyntheticKind) => {
    push(`synthetic: ${kind}`, await measure(frame, await syntheticSave(frame, kind)));
  };

  useEffect(() => {
    (window as unknown as Record<string, unknown>).__tracer = { frame, entries };
  });

  return (
    <div className="grid h-full grid-cols-[minmax(0,1fr)_420px] gap-px bg-[#1c2427] text-[12px]">
      <div className="bg-bg">
        <Editor
          image={frame.dataUrl}
          editorRef={editorRef}
          onLoad={() => setLoadedMs(Math.round(performance.now() - t0.current))}
          onLoadError={() => setError('image failed to load into the canvas')}
          onError={(e) => setError(e.message)}
          onSave={async ({ dataUrl }) => {
            console.info('[tracer] onSave prefix:', dataUrl.slice(0, 30));
            push('editor onSave', await measure(frame, dataUrl));
          }}
        />
      </div>
      <aside className="overflow-auto bg-bg p-4">
        <h1 className="mb-1 text-sm tracking-widest text-sys">TRACER BULLET</h1>
        <p className="mb-3 text-[#829092]">
          editor {loadedMs === null ? 'loading…' : `mounted in ${loadedMs} ms`} · frame {frame.W}×
          {frame.H}
        </p>
        {error && <p className="mb-3 text-breach">ERROR: {error}</p>}
        <div className="mb-4 grid grid-cols-2 gap-2">
          <button
            className="border border-[#334244] p-2 text-left hover:border-sys"
            onClick={() => runSynthetic('untouched')}
          >
            self-test: untouched
          </button>
          <button
            className="border border-[#334244] p-2 text-left hover:border-sys"
            onClick={() => runSynthetic('bar-over-target')}
          >
            self-test: bar over face
          </button>
          <button
            className="border border-[#334244] p-2 text-left hover:border-sys"
            onClick={() => runSynthetic('bar-over-seal')}
          >
            self-test: bar over seal
          </button>
          <button
            className="border border-[#334244] p-2 text-left hover:border-sys"
            onClick={() => runSynthetic('blackout-frame')}
          >
            self-test: blackout frame
          </button>
          <button
            className="col-span-2 border border-[#334244] p-2 text-left hover:border-sys"
            onClick={async () => {
              const img = editorRef.current?.editor?.getImage();
              if (img) push('editor getImage()', await measure(frame, img));
            }}
          >
            editor.getImage() — untouched canvas
          </button>
        </div>
        {entries.map((e, i) => (
          <section key={i} className="mb-4 border-t border-[#273133] pt-3">
            <h2 className="mb-2 text-warn">{e.label}</h2>
            <p>
              format <b>{e.m.prefix}</b> · {e.m.naturalW}×{e.m.naturalH}
              {e.m.sameSize ? '' : ' (SIZE DIFFERS)'} · {(e.m.bytes / 1e6).toFixed(2)} MB
              {e.m.identicalString ? ' · byte-identical string' : ''}
            </p>
            <p>
              max delta {e.m.maxDelta} · untouched floor for this exhibit{' '}
              {UNTOUCHED_FLOOR[FRAME_INDEX]}
            </p>
            <p className="text-[#829092]">
              px over threshold:{' '}
              {Object.entries(e.m.overThreshold)
                .map(([t, n]) => `>${t}:${n}`)
                .join('  ')}
            </p>
            <table className="mt-2 w-full">
              <tbody>
                {e.m.regions.map((r) => (
                  <tr key={r.id} className={r.kind === 'target' ? 'text-warn' : 'text-sys'}>
                    <td>{r.id}</td>
                    <td className="text-[#829092]">{r.kind}</td>
                    <td className="text-right">{r.cover.toFixed(3)}</td>
                    <td className="text-right text-[#829092]">
                      {r.changed}/{r.area}
                    </td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={2}>collateral</td>
                  <td className="text-right">{pct(e.m.collateral)}</td>
                  <td />
                </tr>
              </tbody>
            </table>
          </section>
        ))}
      </aside>
    </div>
  );
}
