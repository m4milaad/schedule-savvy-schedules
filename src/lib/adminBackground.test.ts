import { describe, expect, it } from "vitest";
import { customBackground, luminance, textOn } from "./adminBackground";

describe("adminBackground", () => {
  it("treats empty, invalid and legacy defaults as the default background", () => {
    for (const v of [null, undefined, "", "blue", "#fff", "#3b82f6", "#020817", "#3B82F6"]) {
      expect(customBackground(v)).toBeNull();
    }
    expect(customBackground("#1e293b")).toBe("#1e293b");
  });

  it("puts light text on dark backgrounds and dark text on light ones", () => {
    expect(luminance("#000000")).toBe(0);
    expect(luminance("#ffffff")).toBeCloseTo(1);
    expect(textOn("#1e293b").color).toBe("hsl(0 0% 98%)");
    expect(textOn("#f5efe6").color).toBe("hsl(220 20% 10%)");
  });
});
