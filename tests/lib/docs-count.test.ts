import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

/**
 * Doc-drift guard.
 *
 * business-correctness: README.md's "N tests across M files" summary and its
 * per-file breakdown table must stay in sync with the test files that exist on
 * disk. Adding or removing a test file forces updating both the file count and
 * the table row in the same change; editing the headline count without the
 * table (or vice versa) fails the sum check.
 *
 * The guard is intentionally filesystem- and table-based rather than spawning a
 * nested `vitest` collection: a child Vitest run is both slow (it roughly
 * doubles the suite) and occasionally flaky. The residual gap — adding a test
 * to an existing file without bumping that file's table row — is the one case
 * this does not catch; everything else (new/removed files, a headline that
 * disagrees with the table) fails here.
 */

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const README = path.join(REPO_ROOT, "README.md");
const SKIP_DIRS = new Set(["node_modules", ".next", "dist", "coverage", ".git"]);

function listTestFiles(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      found.push(...listTestFiles(path.join(dir, entry.name)));
    } else if (/\.test\.tsx?$/.test(entry.name)) {
      found.push(path.relative(REPO_ROOT, path.join(dir, entry.name)).split(path.sep).join("/"));
    }
  }
  return found;
}

function readmeSummary(text: string): { tests: number; files: number } {
  const match = text.match(/(\d+) tests across (\d+) files/);
  if (!match) throw new Error("could not find the 'N tests across M files' summary in README.md");
  return { tests: Number(match[1]), files: Number(match[2]) };
}

function readmeTableRows(text: string): { file: string; count: number }[] {
  const rows: { file: string; count: number }[] = [];
  for (const line of text.split("\n")) {
    const match = line.match(/^\|\s*\[([^\]]+)\]\([^)]*\)\s*\|\s*(\d+)\s*\|/);
    if (match) rows.push({ file: match[1], count: Number(match[2]) });
  }
  return rows;
}

describe("documentation drift guard", () => {
  // A single test (one collected case) so the guard contributes exactly one to
  // the suite size it documents; the three assertions cover file count, table
  // membership, and the headline sum.
  it("README counts and per-file table stay in sync with the test files on disk", () => {
    const text = readFileSync(README, "utf-8");
    const actualFiles = listTestFiles(REPO_ROOT).sort();
    const summary = readmeSummary(text);
    const rows = readmeTableRows(text);

    expect(summary.files).toBe(actualFiles.length);
    expect(rows.map((row) => row.file).sort()).toEqual(actualFiles);
    expect(rows.reduce((total, row) => total + row.count, 0)).toBe(summary.tests);
  });
});
