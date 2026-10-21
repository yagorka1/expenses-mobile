/** True when launched from the home screen (installed PWA) rather than in a browser tab. */
export function isStandaloneDisplayMode(window: Window | null): boolean {
  if (!window) {
    return false;
  }
  // `navigator.standalone` is iOS Safari's non-standard flag.
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  return iosStandalone || window.matchMedia('(display-mode: standalone)').matches;
}
