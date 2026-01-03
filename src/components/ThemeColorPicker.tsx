import React from 'react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Palette } from 'lucide-react';

interface ThemeColorPickerProps {
  color: string;
  onChange: (color: string) => void;
}

const DEFAULT_COLOR = '#020817';

const presetColors = [
  '#3b82f6', // Blue
  '#10b981', // Green
  '#8b5cf6', // Purple
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#84cc16', // Lime
];

// Calculate if text should be light or dark based on background color
export const getContrastColor = (hexColor: string): string => {
  // Remove # if present
  const hex = hexColor.replace('#', '');
  
  // Parse RGB values
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // Calculate relative luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // Return black for light backgrounds, white for dark backgrounds
  return luminance > 0.5 ? '#000000' : '#ffffff';
};

export const ThemeColorPicker: React.FC<ThemeColorPickerProps> = ({ color, onChange }) => {
  return (
    <div className="space-y-3">
      <Label className="flex items-center gap-2">
        <Palette className="w-4 h-4" />
        Profile Theme Color
      </Label>
      
      <div className="flex flex-wrap gap-2">
        {/* Reset to Default button */}
        <button
          type="button"
          className={`px-3 py-1 text-xs rounded-full border-2 transition-colors duration-200 ${
            color === DEFAULT_COLOR ? 'border-foreground ring-2 ring-offset-2 ring-primary bg-muted' : 'border-border bg-muted/50'
          }`}
          onClick={() => onChange(DEFAULT_COLOR)}
          title="Reset to Default"
        >
          Reset
        </button>
        {presetColors.map((presetColor) => (
          <button
            key={presetColor}
            type="button"
            className={`w-8 h-8 rounded-full border-2 transition-colors duration-200 ${
              color === presetColor ? 'border-foreground ring-2 ring-offset-2 ring-primary' : 'border-transparent'
            }`}
            style={{ backgroundColor: presetColor }}
            onClick={() => onChange(presetColor)}
            title={presetColor}
          />
        ))}
      </div>
      
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <Input
            type="color"
            value={color}
            onChange={(e) => onChange(e.target.value)}
            className="w-full h-10 p-1 cursor-pointer"
          />
        </div>
        <Input
          type="text"
          value={color}
          onChange={(e) => {
            const value = e.target.value;
            if (/^#[0-9A-Fa-f]{0,6}$/.test(value)) {
              onChange(value);
            }
          }}
          className="w-24 font-mono text-sm"
          placeholder="#3b82f6"
          maxLength={7}
        />
      </div>
      
      {/* Preview */}
      <div 
        className="p-3 rounded-lg flex items-center justify-between transition-all duration-300"
        style={{ 
          backgroundColor: color,
          color: getContrastColor(color)
        }}
      >
        <span className="text-sm font-medium">Preview</span>
        <span className="text-xs opacity-80">Text adapts to background</span>
      </div>
    </div>
  );
};