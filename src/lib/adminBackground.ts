import type React from "react";

/** Swatches offered in Profile → Background. `null` means the default admin background. */
export const BACKGROUND_PRESETS = [
  "#f5efe6", // Sand
  "#eaf1ea", // Sage
  "#e8eef7", // Mist
  "#f3eaf2", // Blush
  "#1e293b", // Slate
  "#1f2937", // Graphite
  "#1e40af", // Blue
  "#059669", // Emerald
  "#7c3aed", // Violet
  "#be185d", // Pink
  "#0891b2", // Cyan
  "#ea580c", // Orange
] as const;

// The DB column defaults to #3b82f6 and older admin code wrote #020817, so both mean "never chose".
// shortcut: these two exact colours can't be picked as a custom background; drop this once the column default is NULL.
const UNSET = new Set(["#3b82f6", "#020817"]);

export const isHexColor = (v: unknown): v is string => typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v);

/** The admin background a profile asked for, or null for the default. */
export function customBackground(themeColor: unknown): string | null {
  return isHexColor(themeColor) && !UNSET.has(themeColor.toLowerCase()) ? themeColor : null;
}

/** WCAG relative luminance of a #rrggbb colour, 0 (black) to 1 (white). */
export function luminance(hex: string): number {
  const channel = (i: number) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

/**
 * Text tokens for content sitting directly on `bg` (the page title row), so a dark
 * background gets light text and vice versa, whatever the light/dark mode is.
 */
export function textOn(bg: string): React.CSSProperties {
  const dark = luminance(bg) < 0.4;
  // CSS custom properties aren't in React's CSSProperties type.
  return (dark
    ? { "--foreground": "0 0% 98%", "--muted-foreground": "0 0% 80%", "--accent": "0 0% 100% / 0.12", "--accent-foreground": "0 0% 98%", color: "hsl(0 0% 98%)" }
    : { "--foreground": "220 20% 10%", "--muted-foreground": "220 9% 36%", "--accent": "0 0% 0% / 0.06", "--accent-foreground": "220 20% 10%", color: "hsl(220 20% 10%)" }) as unknown as React.CSSProperties;
}
