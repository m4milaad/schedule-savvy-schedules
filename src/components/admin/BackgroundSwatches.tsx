import { Check } from 'lucide-react';
import { BACKGROUND_PRESETS } from '@/lib/adminBackground';
import { cn } from '@/lib/utils';

/** Default + preset background swatches. `null` is the default background. */
export const BackgroundSwatches = ({ value, onChange, disabled }: {
  value: string | null;
  onChange: (color: string | null) => void;
  disabled?: boolean;
}) => (
  <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Background colour">
    <button
      type="button"
      role="radio"
      aria-checked={value === null}
      disabled={disabled}
      onClick={() => onChange(null)}
      className={cn(
        "flex h-8 items-center gap-1.5 rounded-md border bg-background px-2.5 text-sm",
        value === null && "ring-2 ring-ring ring-offset-2 ring-offset-background"
      )}
    >
      {value === null && <Check className="h-3.5 w-3.5" />}
      Default
    </button>
    {/* A saved custom colour that isn't a preset stays visible and selected. */}
    {[...BACKGROUND_PRESETS, ...(value && !(BACKGROUND_PRESETS as readonly string[]).includes(value) ? [value] : [])].map((color) => (
      <button
        key={color}
        type="button"
        role="radio"
        aria-checked={value === color}
        aria-label={color}
        title={color}
        disabled={disabled}
        onClick={() => onChange(color)}
        className={cn(
          "h-8 w-8 rounded-md border",
          value === color && "ring-2 ring-ring ring-offset-2 ring-offset-background"
        )}
        style={{ backgroundColor: color }}
      />
    ))}
  </div>
);
