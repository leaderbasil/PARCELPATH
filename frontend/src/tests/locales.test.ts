import { describe, expect, it } from "vitest";

import ar from "@/locales/ar.json";
import en from "@/locales/en.json";

/** Treat arrays as leaves so string lists (hero description) stay one key. */
function flatten(
  value: unknown,
  path = "",
  result: Map<string, unknown> = new Map<string, unknown>()
): Map<string, unknown> {
  if (Array.isArray(value)) {
    result.set(path, value);
    return result;
  }
  if (value !== null && typeof value === "object") {
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      const childPath = path ? `${path}.${key}` : key;
      flatten(child, childPath, result);
    }
    return result;
  }
  result.set(path, value);
  return result;
}

const arLeaves = flatten(ar);
const enLeaves = flatten(en);

describe("locale files", () => {
  it("has exactly the same keys in Arabic and English", () => {
    const arKeys = [...arLeaves.keys()].sort();
    const enKeys = [...enLeaves.keys()].sort();

    expect(arKeys.length).toBeGreaterThan(200);
    expect(enKeys).toEqual(arKeys);
  });

  it("provides a non-empty translation for every key", () => {
    for (const [key, arValue] of arLeaves) {
      const enValue = enLeaves.get(key);
      expect(enValue, `missing English value for ${key}`).toBeDefined();

      if (Array.isArray(arValue)) {
        const arLines = arValue as string[];
        const enLines = Array.isArray(enValue) ? (enValue as string[]) : [];
        expect(Array.isArray(enValue), `English value for ${key} must be a list`).toBe(true);
        expect(enLines).toHaveLength(arLines.length);
        for (const line of arLines) expect(line.trim()).not.toBe("");
        for (const line of enLines) expect(line.trim()).not.toBe("");
      } else {
        const arText = arValue as string;
        const enText = enValue as string;
        expect(typeof arValue, `Arabic value for ${key} must be text`).toBe("string");
        expect(typeof enValue, `English value for ${key} must be text`).toBe("string");
        expect(arText.trim()).not.toBe("");
        expect(enText.trim()).not.toBe("");
      }
    }
  });

  it("keeps Arabic script out of the English copy", () => {
    for (const [key, value] of enLeaves) {
      const text = Array.isArray(value) ? value.join(" ") : (value as string);
      expect(text, `Arabic text found in English key ${key}`).not.toMatch(/[\u0600-\u06FF]/);
    }
  });
});
