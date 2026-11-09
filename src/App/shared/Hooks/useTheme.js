import { useCallback, useEffect, useState } from "react";

/**
 * Light / dark mode for the public store (2026-10-24).
 *
 * Default: "system" (same as the visitor's device). The header button
 * switches between light and dark; the choice is saved in this browser.
 * The resolved theme is written to <html data-theme="…">;
 * shared/Styles/DarkTheme.scss does the rest.
 */
export const THEME_STORAGE_KEY = "alephk.showcase.theme";
export const THEME_OPTIONS = ["light", "dark", "system"];
const DEFAULT_THEME = "system";

export function readThemePreference() {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    return THEME_OPTIONS.includes(value) ? value : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

function systemPrefersDark() {
  try {
    return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches === true;
  } catch {
    return false;
  }
}

export function resolveTheme(preference) {
  if (preference === "system") return systemPrefersDark() ? "dark" : "light";
  return preference === "dark" ? "dark" : "light";
}

export function applyThemePreference(preference) {
  const resolved = resolveTheme(preference);
  document.documentElement.setAttribute("data-theme", resolved);
  return resolved;
}

// Apply as soon as the store loads (no white flash before React renders).
applyThemePreference(readThemePreference());

export default function useTheme() {
  const [preference, setPreferenceState] = useState(readThemePreference);
  const [resolved, setResolved] = useState(() => resolveTheme(readThemePreference()));

  const setPreference = useCallback((next) => {
    const value = THEME_OPTIONS.includes(next) ? next : DEFAULT_THEME;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, value);
    } catch {
      // storage blocked: the choice still applies until the page reloads
    }
    setPreferenceState(value);
    setResolved(applyThemePreference(value));
  }, []);

  // Light <-> dark (used by the header button).
  const toggleTheme = useCallback(() => {
    setPreference(resolveTheme(readThemePreference()) === "dark" ? "light" : "dark");
  }, [setPreference]);

  // "Same as my device": follow the device when it switches.
  useEffect(() => {
    if (preference !== "system" || !window.matchMedia) return undefined;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setResolved(applyThemePreference("system"));
    media.addEventListener?.("change", onChange);
    return () => media.removeEventListener?.("change", onChange);
  }, [preference]);

  return { preference, resolved, setPreference, toggleTheme };
}
