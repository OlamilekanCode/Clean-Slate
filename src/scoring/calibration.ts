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
 * Per-channel delta above which a pixel counts as changed. Must sit above the export noise floor.
 * At 24 an untouched broadcast frame scored its channel-bug seal at 0.063 — over the 0.05 breach line — so
 * a player who changed nothing would be charged suspicion. At 48 the worst untouched region anywhere is
 * 0.002, while a black rectangle over a face still scores 0.859.
 */
export const MATERIAL = 48;

/**
 * Largest per-pixel delta of an untouched save, by exhibit index (0-based). Broadcast is the binding one.
 * Wobbles by a few points run to run because sensor grain is re-rolled on each generation (broadcast: 82–87).
 */
export const UNTOUCHED_FLOOR = [36, 31, 36, 87, 33] as const;
