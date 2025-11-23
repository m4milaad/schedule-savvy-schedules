import { useEffect, useCallback } from 'react';

type KeyboardShortcut = {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
};

/**
 * Custom hook for keyboard shortcuts
 * @param shortcut - Keyboard shortcut configuration
 * @param callback - Function to call when shortcut is pressed
 * @param enabled - Whether the shortcut is enabled (default: true)
 */
export function useKeyboardShortcut(
  shortcut: KeyboardShortcut,
  callback: () => void,
  enabled: boolean = true
) {
  const handleKeyPress = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      const { key, ctrl, shift, alt, meta } = shortcut;

      const isMatch =
        event.key.toLowerCase() === key.toLowerCase() &&
        (ctrl === undefined || event.ctrlKey === ctrl) &&
        (shift === undefined || event.shiftKey === shift) &&
        (alt === undefined || event.altKey === alt) &&
        (meta === undefined || event.metaKey === meta);

      if (isMatch) {
        event.preventDefault();
        callback();
      }
    },
    [shortcut, callback, enabled]
  );

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress, enabled]);
}

/**
 * Hook for multiple keyboard shortcuts
 */
export function useKeyboardShortcuts(
  shortcuts: Array<{ shortcut: KeyboardShortcut; callback: () => void; enabled?: boolean }>
) {
  const handleKeyPress = useCallback(
    (event: KeyboardEvent) => {
      for (const { shortcut, callback, enabled = true } of shortcuts) {
        if (!enabled) continue;

        const { key, ctrl, shift, alt, meta } = shortcut;

        const isMatch =
          event.key.toLowerCase() === key.toLowerCase() &&
          (ctrl === undefined || event.ctrlKey === ctrl) &&
          (shift === undefined || event.shiftKey === shift) &&
          (alt === undefined || event.altKey === alt) &&
          (meta === undefined || event.metaKey === meta);

        if (isMatch) {
          event.preventDefault();
          callback();
          break;
        }
      }
    },
    [shortcuts]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);
}

/**
 * Common keyboard shortcuts
 */
export const SHORTCUTS = {
  SAVE: { key: 's', ctrl: true },
  CANCEL: { key: 'Escape' },
  DELETE: { key: 'Delete' },
  SEARCH: { key: 'k', ctrl: true },
  NEW: { key: 'n', ctrl: true },
  REFRESH: { key: 'r', ctrl: true },
  SELECT_ALL: { key: 'a', ctrl: true },
  COPY: { key: 'c', ctrl: true },
  PASTE: { key: 'v', ctrl: true },
} as const;
