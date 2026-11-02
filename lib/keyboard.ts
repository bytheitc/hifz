import type { Grade } from "./srs";

/** The parts of a keyboard event the grading shortcut looks at. A React
 *  keyboard event has all of these, so the page can pass it straight in. */
export type KeyPress = {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
};

/** Digits rather than letters, so a reciter can grade without leaving the
 *  number row and the keys cannot clash with any letter a person types. A
 *  modified press is left alone because Ctrl+1 and Cmd+1 are the browser's
 *  tab shortcuts, and they must not also grade the row. */
export function gradeForKeyPress({ key, ctrlKey, metaKey, altKey }: KeyPress): Grade | null {
  if (ctrlKey || metaKey || altKey) return null;
  switch (key) {
    case "1":
      return "solid";
    case "2":
      return "shaky";
    case "3":
      return "lost";
    default:
      return null;
  }
}

/** The row to focus once the row at `index` is graded and leaves the due list.
 *  Its next neighbour takes its place, so focus moves there, or to the row
 *  above when the graded row was last. Null means no row is left to focus. */
export function focusAfterGrade(index: number, rowCount: number): number | null {
  if (index + 1 < rowCount) return index + 1;
  if (index > 0) return index - 1;
  return null;
}
