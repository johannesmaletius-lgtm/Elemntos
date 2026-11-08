// localStorage kann (z.B. in eingebetteten Vorschauen) fehlen oder Fehler werfen.
export function load(key, fallback = null) {
  try { const v = localStorage.getItem(key); return v === null ? fallback : v; } catch { return fallback; }
}
export function save(key, value) {
  try { localStorage.setItem(key, value); } catch { /* egal */ }
}
export function setUrl(url) {
  try { history.replaceState(null, '', url); } catch { /* egal */ }
}
