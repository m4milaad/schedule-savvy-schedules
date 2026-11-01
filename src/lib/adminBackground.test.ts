import { describe, expect, it } from "vitest";
import { adminPalette, customBackground, luminance } from "./adminBackground";

describe("adminBackground", () => {
  it("treats empty, invalid and legacy defaults as the default background", () => {
    for (const v of [null, undefined, "", "blue", "#fff", "#3b82f6", "#020817", "#3B82F6"]) {
      expect(customBackground(v)).toBeNull();
    }
    expect(customBackground("#1e293b")).toBe("#1e293b");
  });

  it("measures luminance", () => {
    expect(luminance("#000000")).toBe(0);
    expect(luminance("#ffffff")).toBeCloseTo(1);
  });

  it("tints sidebar and cards from the background, with readable text", () => {
    const dark = adminPalette("#1e293b"); // slate, hue ~217
    expect(dark["--background"]).toBe("217 33% 17%");
    expect(dark["--foreground"]).toBe("0 0% 98%");
    expect(dark["--sidebar-background"]).toBe("217 33% 13%");
    expect(dark["--card"]).toBe("217 18% 24%");

    const light = adminPalette("#f5efe6"); // sand
    expect(light["--foreground"]).toMatch(/ 25% 10%$/);
    expect(light["--card"]).not.toBe(light["--background"]);
    expect(light["--sidebar-background"]).not.toBe(light["--background"]);
  });
});
