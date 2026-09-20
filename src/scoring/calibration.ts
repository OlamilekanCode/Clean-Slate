/**
 * Every number the scorer owes to the editor's behaviour, in one place. If scores start feeling wrong,
 * or the editor is upgraded, this is the first file to look at — then re-measure with `/?frame=1..5`.
 *
 * Measured 2026-09-20 on headless Microsoft Edge (Windows), editor bundle 2.10.0 behind
 * @unlayer/react-image-editor 1.0.2, saving with zero edits through onSave (which returns JPEG).
 */

/** The five exhibits, in the order the frame generators produce them. */
export const EXHIBIT_ORDER = ['cctv', 'anpr', 'report', 'broadcast', 'witness'] as const;
export type ExhibitId = (typeof EXHIBIT_ORDER)[number];

/**
 * The editor bundle is fetched from cdn.unlayer.com/image-editor/<version>/editor.js. Unpinned, "latest"
 * moves whenever Unlayer ships (2.10.0 was published 2026-09-18) and would silently change the JPEG
 * export these thresholds were calibrated against. Bump this deliberately, and re-measure when you do.
 */
export const EDITOR_VERSION = '2.10.0';

/**
 * Default per-channel delta above which a pixel counts as changed, for anything without its own entry.
 * Must sit above the export noise floor. At 24 an untouched broadcast frame scored its channel-bug seal at
 * 0.063 — over the 0.05 breach line — so a player who changed nothing would be charged suspicion. At 48 the
 * worst untouched region anywhere is 0.002.
 */
export const MATERIAL = 48;

/**
 * MATERIAL per exhibit for TARGETS, chosen from real-editor calibration runs (45 on the three slice frames, then
 * 32 more on the report and broadcast).
 *
 * One global 48 is too high for dark content: black painted over an already-dark target changes by less than 48,
 * so a completely opaque rectangle scored only 0.45 credit on the CCTV jacket, 0.55 on the ANPR car, 0.61 on the
 * witness car and 0.15 on the broadcast strap (cream text on a navy bar). Lowering the threshold gives those
 * targets full credit. An opaque rectangle over a target now earns full credit on every exhibit.
 *
 *   cctv      32  jacket 1.00 (0.87 at 40)
 *   anpr      24  car 1.00 (0.84 at 32)
 *   report    24  name 1.00 (0.92 at 32, 0.78 at 48: the dark glyphs barely change under black)
 *   broadcast 32  strap 1.00 (0.18 at 40)
 *   witness   32  car 1.00 (0.76 at 40)
 *
 * The cost is leniency toward translucent overlays: on the CCTV face a 50% overlay earns full credit at 32 or
 * below but only 0.10 at 48. Scoring by how much pixels changed cannot tell a readable translucent overlay from
 * an opaque one, so the brief states the rule: cover targets opaquely.
 */
export const MATERIAL_BY_EXHIBIT: Record<ExhibitId, number> = {
  cctv: 32,
  anpr: 24,
  report: 24,
  broadcast: 32,
  witness: 32,
};

export const materialFor = (id: ExhibitId): number => MATERIAL_BY_EXHIBIT[id] ?? MATERIAL;

/**
 * A stricter threshold for SEALS where one is needed. The two mistakes are not symmetric: under-crediting an
 * opaque edit over a target is unfair to the player, so targets want a sensitive threshold, but a false seal
 * breach (charged for an edit that did not touch the seal) is the unfair outcome for seals, so they want a
 * robust one. An opaque rectangle over a seal still breaches at every threshold measured.
 *
 *   broadcast 48  its untouched channel-bug seal reads 0.034 at the target threshold of 32 (breach line 0.05),
 *                 but 0.002 at 48, worst of 6 fresh runs. The crisp white-on-red bug rings hardest in JPEG.
 *   report    32  its untouched evidence-stamp seal reads 0.007 at 24 and 0.0006 at 32, worst of 6 runs.
 *
 * Exhibits not listed use their target threshold.
 */
export const SEAL_MATERIAL_BY_EXHIBIT: Partial<Record<ExhibitId, number>> = {
  report: 32,
  broadcast: 48,
};

export const sealMaterialFor = (id: ExhibitId): number =>
  SEAL_MATERIAL_BY_EXHIBIT[id] ?? materialFor(id);

/**
 * Largest per-pixel delta of an untouched save. Broadcast is the binding one. Wobbles by a few points run
 * to run because sensor grain is re-rolled on each generation (broadcast: 82–87).
 */
export const UNTOUCHED_FLOOR: Record<ExhibitId, number> = {
  cctv: 36,
  anpr: 31,
  report: 36,
  broadcast: 87,
  witness: 33,
};
