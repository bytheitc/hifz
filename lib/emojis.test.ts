import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const EMOJI_REGEX = /(\p{Extended_Pictographic}|\p{Regional_Indicator}|[\u{0023}\u{002A}\u{0030}-\u{0039}]\uFE0F?\u20E3)/u;

const IGNORED_DIRS = new Set([
  ".git",
  "node_modules",
  ".next",
  "dist",
  "build",
  "coverage",
  ".idea",
  ".vscode",
  ".claude"
]);

const IGNORED_EXTS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".ico",
  ".webp",
  ".svg",
  ".woff",
  ".woff2",
  ".ttf",
  ".eot",
  ".tsbuildinfo"
]);

const IGNORED_FILES = new Set([
  "pnpm-lock.yaml",
  "package-lock.json",
  "yarn.lock",
  ".DS_Store"
]);

const here = fileURLToPath(import.meta.url);
const rootDir = resolve(here, "../..");

function findEmojisInRepo(dir: string): string[] {
  const violations: string[] = [];
  const entries = readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (IGNORED_DIRS.has(entry.name) || IGNORED_FILES.has(entry.name)) continue;
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      violations.push(...findEmojisInRepo(fullPath));
    } else if (entry.isFile()) {
      if (IGNORED_EXTS.has(extname(entry.name))) continue;
      if (entry.name === "emojis.test.ts" || entry.name === "check-no-emojis.mjs") continue;

      const content = readFileSync(fullPath, "utf8");
      const lines = content.split(/\r?\n/);
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (EMOJI_REGEX.test(line)) {
          violations.push(`${fullPath}:${i + 1}: ${line.trim()}`);
        }
      }
    }
  }

  return violations;
}

describe("Repository emoji policy", () => {
  it("contains no emojis anywhere in the codebase", () => {
    const violations = findEmojisInRepo(rootDir);
    expect(violations).toEqual([]);
  });
});
