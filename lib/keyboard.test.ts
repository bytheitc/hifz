import { describe, expect, it } from "vitest";
import { type KeyPress, focusAfterGrade, gradeForKeyPress } from "./keyboard";

function press(key: string, modifiers: Partial<Omit<KeyPress, "key">> = {}): KeyPress {
  return { key, ctrlKey: false, metaKey: false, altKey: false, ...modifiers };
}

describe("gradeForKeyPress", () => {
  it("grades a focused row with the 1, 2 and 3 keys and ignores every other key", () => {
    expect(gradeForKeyPress(press("1"))).toBe("solid");
    expect(gradeForKeyPress(press("2"))).toBe("shaky");
    expect(gradeForKeyPress(press("3"))).toBe("lost");
    expect(gradeForKeyPress(press("4"))).toBeNull();
    expect(gradeForKeyPress(press("a"))).toBeNull();
    expect(gradeForKeyPress(press("Enter"))).toBeNull();
  });

  it("leaves Ctrl, Cmd and Alt presses alone so browser tab shortcuts do not grade the row", () => {
    expect(gradeForKeyPress(press("1", { ctrlKey: true }))).toBeNull();
    expect(gradeForKeyPress(press("2", { metaKey: true }))).toBeNull();
    expect(gradeForKeyPress(press("3", { altKey: true }))).toBeNull();
  });
});

describe("focusAfterGrade", () => {
  it("moves focus to the next row when a row in the middle is graded", () => {
    expect(focusAfterGrade(1, 3)).toBe(2);
  });

  it("moves focus to the row above when the last row is graded, so focus stays in the list", () => {
    expect(focusAfterGrade(2, 3)).toBe(1);
  });

  it("has no row to focus when the only due row is graded", () => {
    expect(focusAfterGrade(0, 1)).toBeNull();
  });
});
