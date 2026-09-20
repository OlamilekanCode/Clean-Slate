import { mk } from '../frames/sensor';
import { MATERIAL } from './calibration';

export type Pixels = { data: Uint8ClampedArray; W: number; H: number };

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('image failed to decode'));
    img.src = src;
  });
}

/** Rasterise an image onto a fixed W×H canvas so two images are always comparable. */
export async function toPixels(
  src: string,
  W: number,
  H: number,
): Promise<{ px: Pixels; naturalW: number; naturalH: number }> {
  const img = await loadImage(src);
  const [, ctx] = mk(W, H);
  ctx.drawImage(img, 0, 0, W, H);
  return {
    px: { data: ctx.getImageData(0, 0, W, H).data, W, H },
    naturalW: img.naturalWidth,
    naturalH: img.naturalHeight,
  };
}

/** Max absolute delta across R, G and B for every pixel — not luminance, so an equal-brightness colour swap still registers. */
export function deltaMap(a: Pixels, b: Pixels): Uint8Array {
  const n = a.W * a.H;
  const out = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const j = i * 4;
    const dr = Math.abs(a.data[j] - b.data[j]);
    const dg = Math.abs(a.data[j + 1] - b.data[j + 1]);
    const db = Math.abs(a.data[j + 2] - b.data[j + 2]);
    out[i] = dr > dg ? (dr > db ? dr : db) : dg > db ? dg : db;
  }
  return out;
}

/** Binary mask of pixels whose delta exceeds the threshold. */
export function diffMask(delta: Uint8Array, threshold = MATERIAL): Uint8Array {
  const out = new Uint8Array(delta.length);
  for (let i = 0; i < delta.length; i++) out[i] = delta[i] > threshold ? 1 : 0;
  return out;
}
