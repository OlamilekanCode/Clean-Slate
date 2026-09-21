import { EDITOR_VERSION } from '../scoring/calibration';

const EMBED_URL = 'https://cdn.unlayer.com/image-editor/embed.js';

/**
 * Load the pinned editor bundle, fetching embed.js first if the page's own script tag never delivered it.
 *
 * embed.js memoises its first load() call, so the version must be passed HERE. The preload in index.html used
 * to call load() with no version, which locked in "latest" and made any later pin a no-op. The same trap exists
 * on a retry: if embed.js failed at boot, the React wrapper would fetch its own copy and call load() unpinned,
 * so a recovery could silently change the JPEG export the thresholds are calibrated on. Retries therefore come
 * through here too. If the pinned build is ever unpublished the loader silently falls forward to latest, so
 * shout instead of scoring quietly.
 */
/** The most recent load failure, or null once a load has succeeded. Lets the Edit screen fail fast. */
let lastLoadError: Error | null = null;
export const getEditorLoadError = (): Error | null => lastLoadError;

export function loadPinnedEditor(): Promise<void> {
  const attempt = loadOnce();
  attempt.then(
    () => {
      lastLoadError = null;
    },
    (e: Error) => {
      lastLoadError = e;
    },
  );
  return attempt;
}

function loadOnce(): Promise<void> {
  const start = () => {
    const embed = window.ImageEditor;
    if (!embed)
      return Promise.reject(new Error('embed.js loaded but window.ImageEditor is missing'));
    return embed.load({ version: EDITOR_VERSION }).then(() => {
      if (!embed.baseUrl.endsWith(`/${EDITOR_VERSION}`)) {
        console.error(
          `[editor] pinned ${EDITOR_VERSION} but loaded ${embed.baseUrl}: scoring is calibrated for ` +
            `${EDITOR_VERSION}; re-measure via /?frame=1..5 and update calibration.ts`,
        );
      }
    });
  };
  if (window.ImageEditor) return start();
  return new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = EMBED_URL;
    script.onload = () => start().then(resolve, reject);
    script.onerror = () => {
      script.remove();
      reject(new Error('embed.js failed to load'));
    };
    document.head.appendChild(script);
  });
}

/** Start downloading the pinned editor at boot, not when the player first opens it. */
export function preloadEditor(): void {
  loadPinnedEditor().catch((e) => console.error('[editor] preload failed:', e.message));
}
