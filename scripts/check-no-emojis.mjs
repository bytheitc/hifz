#!/usr/bin/env node
import { readdirSync, readFileSync } from "node:fs";
import { join, extname, relative, resolve } from "node:path";
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

const rootDir = resolve(fileURLToPath(import.meta.url), "../..");

let totalFiles = 0;
const violations = [];

function scan(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (IGNORED_DIRS.has(entry.name)) continue;
    if (IGNORED_FILES.has(entry.name)) continue;

    const fullPath = join(dir, entry.name);
    // No self-exemption: the regex is written with Unicode property
    // escapes, not literal characters, so this file can hold itself to
    // the same rule. It previously skipped itself, which is exactly how
    // its own output came to contain a tick and a cross.

    if (entry.isDirectory()) {
      scan(fullPath);
    } else if (entry.isFile()) {
      if (IGNORED_EXTS.has(extname(entry.name))) continue;

      totalFiles++;
      const content = readFileSync(fullPath, "utf8");
      const lines = content.split(/\r?\n/);

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const match = line.match(EMOJI_REGEX);
        if (match) {
          violations.push({
            file: relative(rootDir, fullPath),
            line: i + 1,
            char: match[0],
            snippet: line.trim()
          });
        }
      }
    }
  }
}

scan(rootDir);

if (violations.length > 0) {
  console.error(`FAIL  Emoji check failed: ${violations.length} emoji(s) found in repository.`);
  console.error(`  Emojis are strictly prohibited across this codebase.\n`);
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line} -> "${v.char}" in: ${v.snippet}`);
  }
  process.exit(1);
} else {
  console.log(`OK    No emojis found across ${totalFiles} checked files.`);
  process.exit(0);
}
