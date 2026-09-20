import { EDITOR_VERSION } from '../scoring/calibration';

/**
 * Start downloading the pinned editor bundle at boot, not when the player first opens the editor.
 *
 * embed.js memoises its first load() call, so the version must be passed HERE — the preload in index.html
 * used to call load() with no version, which locked in "latest" and made any later pin a no-op. If the pinned
 * build is ever unpublished the loader silently falls forward to latest, which changes the JPEG export our
 * thresholds are calibrated on, so shout instead of scoring quietly.
 */
export function preloadEditor(): void {
  const embed = window.ImageEditor;
  if (!embed) {
    console.error('[editor] embed.js did not load; the editor will fail to mount');
    return;
  }
  embed
    .load({ version: EDITOR_VERSION })
    .then(() => {
      if (!embed.baseUrl.endsWith(`/${EDITOR_VERSION}`)) {
        console.error(
          `[editor] pinned ${EDITOR_VERSION} but loaded ${embed.baseUrl} — scoring is calibrated for ` +
            `${EDITOR_VERSION}; re-measure via /?frame=1..5 and update calibration.ts`,
        );
      }
    })
    .catch(() => {});
}
