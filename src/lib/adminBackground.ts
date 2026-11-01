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

function hexToHsl(hex: string): [number, number, number] {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as [number, number, number];
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min, l = (max + min) / 2;
  if (d === 0) return [0, 0, l * 100];
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [(h * 60 + 360) % 360, s * 100, l * 100];
}

/**
 * The whole admin palette (shadcn HSL tokens) tinted from one background colour:
 * sidebar a step darker, cards and menus a step lighter, text light or dark for contrast.
 * Applied on <html>, so dialogs and menus in portals follow it too.
 */
export function adminPalette(bg: string): Record<string, string> {
  const [h, s, l] = hexToHsl(bg);
  const tone = (dl: number, sat = s) =>
    `${Math.round(h)} ${Math.round(Math.min(100, sat))}% ${Math.round(Math.max(2, Math.min(99, l + dl)))}%`;
  const dark = luminance(bg) < 0.4;

  const surface = dark ? tone(7, s * 0.55) : tone(Math.max(5, 99 - l), s * 0.5);
  const raised = dark ? tone(12, s * 0.45) : tone(-6, s * 0.6);
  const line = dark ? tone(17, s * 0.4) : tone(-12, s * 0.6);
  const text = dark ? "0 0% 98%" : `${Math.round(h)} 25% 10%`;
  const subtle = dark ? `${Math.round(h)} 15% 78%` : `${Math.round(h)} 12% 36%`;
  const primary = dark ? "0 0% 98%" : `${Math.round(h)} 25% 14%`;
  const onPrimary = dark ? tone(0) : "0 0% 100%";

  return {
    "--background": tone(0),
    "--foreground": text,
    "--card": surface,
    "--card-foreground": text,
    "--popover": surface,
    "--popover-foreground": text,
    "--primary": primary,
    "--primary-foreground": onPrimary,
    "--secondary": raised,
    "--secondary-foreground": text,
    "--muted": raised,
    "--muted-foreground": subtle,
    "--accent": raised,
    "--accent-foreground": text,
    "--border": line,
    "--input": line,
    "--ring": primary,
    "--sidebar-background": tone(dark ? -4 : -3),
    "--sidebar-foreground": text,
    "--sidebar-primary": primary,
    "--sidebar-primary-foreground": onPrimary,
    "--sidebar-accent": raised,
    "--sidebar-accent-foreground": text,
    "--sidebar-border": line,
    "--sidebar-ring": primary,
  };
}
