# Good first issues

Drafted starter tasks. Comment on the matching GitHub issue to claim one.

Difficulty: [Easy] gentle · [Medium] straightforward code · [Hard] needs some thought

---

### 1. [Easy] Add juz boundaries

**Problem.** Progress is reported in ayahs and surahs. Almost everyone memorising
thinks in **juz** — "I'm on juz 29" is the sentence people actually say — and the app
cannot express it, because we deliberately did not ship juz data rather than ship it
wrong.

**Task.** Add the 30 juz start points (surah + ayah) to `data/`, then report juz
completed and juz in progress alongside the existing numbers. Add a test asserting
there are exactly 30 and that they are strictly increasing.

**Files.** New `data/juz.json`, `lib/progress.ts`, `lib/progress.test.ts`, `app/page.tsx`.

---

### 2. [Easy] Export and import a trail as a file

**Problem.** Everything lives in `localStorage`, which is the right call for privacy
and the wrong one if you change phone or clear your browser. Years of records vanish.

**Task.** A button that downloads the trail as JSON, and one that reads a file back
in. Importing should merge rather than replace, and say how many portions it added.

**Files.** `lib/storage.ts`, `app/page.tsx`.

**Watch out for.** Validate on import — someone will eventually open a file that is
not a trail, and it should say so rather than wipe their data.

---

### 3. [Medium] A revision streak

**Problem.** The app shows what is due but nothing about whether you have been
turning up. For a daily habit, that is most of the motivation.

**Task.** Record which days had at least one review and show a current streak and a
longest streak. Keep it honest: a day with nothing due should not break a streak, and
should not extend one either.

**Files.** `lib/srs.ts` or a new `lib/streak.ts` **with tests**, `lib/storage.ts`,
`app/page.tsx`.

---

### 4. [Medium] Make the interval table configurable

**Problem.** `REVIEW_INTERVALS_DAYS` is a constant. Some people revise far more
intensively than it assumes, particularly during Ramadan, and have no way to say so.

**Task.** A settings panel with two or three presets (gentle / standard / intensive)
plus a custom option, stored alongside the trail. Changing it must not corrupt
existing boxes — think about what happens to a portion in box 5 when the table
shortens to four entries, and test that case.

**Files.** `lib/srs.ts`, `lib/srs.test.ts`, `lib/storage.ts`, new settings component.

---

### 5. [Medium] Split and merge portions from the interface

**Problem.** `mergePortions` handles overlap when counting, but the stored list still
shows "Al-Baqarah 1–20" and "Al-Baqarah 21–40" as two entries with two schedules. A
student who now knows them as one stretch cannot say so.

**Task.** Let a portion be split at an ayah, and two adjoining portions be merged.
Decide — and write down in the PR — what happens to the box and lapse count when two
portions with different histories merge.

**Files.** `lib/progress.ts`, `app/page.tsx`, tests.

---

### 6. [Hard] A "how long until I finish" projection

**Problem.** The hardest question for anyone memorising is whether their current pace
is realistic. We have the data to answer it and do not.

**Task.** From the dates portions were added, estimate ayahs per week and project a
completion date, with an honest statement of the uncertainty. Refuse to project from
fewer than a few weeks of history rather than printing a confident wrong number.

**Files.** New `lib/projection.ts` **with tests**, `app/page.tsx`.

---

### 7. [Medium] Arabic surah names in the interface

**Problem.** `data/quran-meta.json` carries `arabicName` for all 114 surahs and the
interface never shows it.

**Task.** Show the Arabic name alongside the transliteration, with correct `dir="rtl"`
and `lang="ar"`. Check it does not break the layout of the due list at phone width.

**Files.** `lib/quran.ts`, `app/page.tsx`, components.

---

### 8. [Easy] Keyboard-only review

**Problem.** Grading a long due list means moving the mouse between three small
buttons for every row. Someone doing twenty portions a day will feel this.

**Task.** Keyboard shortcuts (1/2/3 for solid/shaky/lost) that act on a focused row,
with visible focus and a key legend. Make sure it does not fire while someone is
typing in the add-portion form.

**Files.** `app/page.tsx`, a new component.

---

### 9. [Medium] Make it installable and work offline

**Problem.** The app is built to need no network and is delivered over one.

**Task.** Add a web app manifest and a service worker so it installs to the home
screen and opens with no connection.

**Files.** `app/manifest.ts`, `public/`, `next.config.ts`.

---

### 10. [Hard] Sort out what a "lapse" should really cost

**Problem.** A lost portion currently drops straight to box 0 — a one-day interval.
That is deliberate (see the note at the top of `lib/srs.ts`) but it is a guess, and
for someone who has lost the same portion four times it may be making things worse
rather than better.

**Task.** Research how established hifz revision methods handle repeated loss, write
up what you find in the issue, and propose a change. **Open the discussion before
writing code** — this one is a conversation first.

**Files.** `lib/srs.ts`, `lib/srs.test.ts`.
