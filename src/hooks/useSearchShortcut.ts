import { useEffect, RefObject } from 'react';

/**
 * Custom hook to focus a search input when "/" key is pressed
 * @param inputRef - Reference to the input element to focus
 * @param enabled - Whether the shortcut is enabled (default: true)
 */
export const useSearchShortcut = (
  inputRef: RefObject<HTMLInputElement>,
  enabled = true
) => {
  useEffect(() => {
    if (!enabled || !inputRef.current) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if "/" is pressed and not in an input/textarea
      if (
        event.key === '/' &&
        !['INPUT', 'TEXTAREA'].includes((event.target as HTMLElement).tagName) &&
        !(event.target as HTMLElement).isContentEditable
      ) {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [inputRef, enabled]);
};
