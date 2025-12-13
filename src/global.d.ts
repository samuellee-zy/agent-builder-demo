/**
 * @file src/global.d.ts
 * @description Global Type Augmentations.
 * 
 * Extends the `Window` interface to support third-party or custom globals.
 * Currently used for `AIStudio` integration hooks if present.
 */

export {};

declare global {
  interface Window {
    /**
     * Optional AI Studio helper attached to window.
     * Used for retrieving API keys in some demo environments.
     */
    aistudio: {
      openSelectKey: () => Promise<void>;
    };
  }
}
