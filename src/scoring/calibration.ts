/**
 * Every number the scorer owes to the editor's behaviour, in one place. If scores start feeling wrong,
 * or the editor is upgraded, this is the first file to look at — then re-measure with `/?frame=1..5`.
 *
 * Measured 2026-09-20 on headless Microsoft Edge (Windows), editor bundle 2.10.0 behind
 * @unlayer/react-image-editor 1.0.2, saving with zero edits through onSave (which returns JPEG).
 */

/**
 * The editor bundle is fetched from cdn.unlayer.com/image-editor/<version>/editor.js. Unpinned, "latest"
 * moves whenever Unlayer ships (2.10.0 was published 2026-09-18) and would silently change the JPEG
 * export these thresholds were calibrated against. Bump this deliberately, and re-measure when you do.
 */
export const EDITOR_VERSION = '2.10.0';

/**
 * Default per-channel delta above which a pixel counts as changed, used for any exhibit without its own
 * entry below. Must sit above the export noise floor. At 24 an untouched broadcast frame scored its
 * channel-bug seal at 0.063 — over the 0.05 breach line — so a player who changed nothing would be charged
 * suspicion. At 48 the worst untouched region anywhere is 0.002.
 */
export const MATERIAL = 48;

/**
 * MATERIAL per exhibit (0-based index), chosen from real-editor calibration runs.
 *
 * One global 48 is too high for the dark exhibits: black painted over an already-dark target changes by
 * less than 48, so a completely opaque rectangle scored only 0.45 credit on the CCTV jacket, 0.55 on the
 * ANPR car and 0.61 on the witness car. Lowering the threshold for those frames gives them full credit, and
 * an untouched save stays clean (worst untouched region over 4 fresh runs: 0.0006 at 24, 0 at 32, against
 * the 0.05 breach line).
 *   1 CCTV     32  jacket 1.00 (0.87 at 40)
 *   2 ANPR     24  car 1.00 (0.84 at 32)
 *   3 Report   48  not yet measured for dark targets, so the safe default
 *   4 Broadcast 48 needs 48: at 24 its untouched channel-bug seal reads 0.063
 *   5 Witness  32  car 1.00 (0.76 at 40)
 *
 * The cost is leniency toward translucent overlays: on the CCTV face a 50% overlay earns full credit at 32
 * or below but only 0.10 at 48. Scoring by how much pixels changed cannot tell a readable translucent overlay
 * from an opaque one, so the brief must tell players to cover targets opaquely.
 */
export const MATERIAL_BY_EXHIBIT = [32, 24, 48, 48, 32] as const;

export const materialFor = (exhibitIndex: number): number =>
  MATERIAL_BY_EXHIBIT[exhibitIndex] ?? MATERIAL;

/**
 * Largest per-pixel delta of an untouched save, by exhibit index (0-based). Broadcast is the binding one.
 * Wobbles by a few points run to run because sensor grain is re-rolled on each generation (broadcast: 82–87).
 */
export const UNTOUCHED_FLOOR = [36, 31, 36, 87, 33] as const;
