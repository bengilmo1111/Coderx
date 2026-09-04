/**
 * Optional character art.
 *
 * The cast renders as emoji by default, which costs nothing and works
 * everywhere. Real artwork drops in on top without touching the renderer:
 * put PNGs in /public/cast and list them in /public/cast/manifest.json.
 *
 * The manifest is what keeps this quiet — without it we make exactly one
 * failed request and fall back, rather than a 404 per character per load.
 */

export type ArtManifest = Record<string, string>;

const images = new Map<string, HTMLImageElement>();
let manifest: ArtManifest = {};
let state: 'idle' | 'loading' | 'ready' = 'idle';

/** The drawable image for a character, or null to fall back to the emoji. */
export function artFor(character: string): HTMLImageElement | null {
  const img = images.get(character);
  return img && img.complete && img.naturalWidth > 0 ? img : null;
}

/**
 * Loads the manifest and its images once. `onReady` fires after each image
 * arrives so a still canvas repaints rather than waiting for the next run.
 */
export function loadCastArt(onReady: () => void): void {
  if (state !== 'idle' || typeof window === 'undefined') return;
  state = 'loading';

  fetch('/cast/manifest.json')
    .then((res) => (res.ok ? res.json() : {}))
    .then((data: ArtManifest) => {
      manifest = data ?? {};
      state = 'ready';
      for (const [character, src] of Object.entries(manifest)) {
        const img = new Image();
        img.onload = onReady;
        img.onerror = () => images.delete(character);
        img.src = src;
        images.set(character, img);
      }
      if (Object.keys(manifest).length) onReady();
    })
    .catch(() => {
      // No manifest, no artwork, no problem — emoji it is.
      state = 'ready';
    });
}
