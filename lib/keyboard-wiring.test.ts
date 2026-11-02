import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// The grading keys act on a focused row inside the page component, and that
// component needs a DOM to run. No DOM test environment is set up here, so
// these checks read the page source instead. A change that drops the focus
// hand-off then fails here, not after a user loses their place in the list.
const page = readFileSync(fileURLToPath(new URL("../app/page.tsx", import.meta.url)), "utf8");

describe("due rows on the home page", () => {
  it("make each row focusable and grade it from the keyboard", () => {
    expect(page).toContain("tabIndex={0}");
    expect(page).toContain("onKeyDown={(event) => gradeFromKey(event, portion)}");
  });

  it("move focus to a neighbour when the graded row leaves the list", () => {
    expect(page).toContain("focusAfterGrade(rows.indexOf(row), rows.length)");
    expect(page).toContain("target.focus()");
  });
});
