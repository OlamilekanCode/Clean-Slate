import type { Frame, Rect } from '../frames/sensor';
import { mk } from '../frames/sensor';
import { loadImage } from './diff';
import { toPixelRect } from './score';

export type SyntheticKind = 'untouched' | 'bar-over-target' | 'bar-over-seal' | 'blackout-frame';

/**
 * Build a stand-in for what the editor would save, bypassing the editor entirely.
 * Lets us prove the scoring maths independently of whatever the editor's export does to the pixels.
 */
export async function syntheticSave(frame: Frame, kind: SyntheticKind, targetId = frame.targets[0].id): Promise<string> {
  const { W, H } = frame;
  const [c, x] = mk(W, H);
  x.drawImage(await loadImage(frame.dataUrl), 0, 0, W, H);
  x.fillStyle = '#000';
  const bar = (r: Rect) => {
    const p = toPixelRect(r, W, H);
    x.fillRect(p.x, p.y, p.w, p.h);
  };
  if (kind === 'bar-over-target') frame.targets.find((t) => t.id === targetId)!.rects.forEach(bar);
  if (kind === 'bar-over-seal') frame.seals[0].rects.forEach(bar);
  if (kind === 'blackout-frame') x.fillRect(0, 0, W, H);
  return c.toDataURL('image/png');
}
