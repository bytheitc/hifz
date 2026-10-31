# Hifz Trail

**A Qur'an memorisation and revision tracker that runs entirely on your own device.**

---

## The problem

Memorising is the part people plan. Revision is the part that decides whether any of
it lasts, and almost nobody has a system for it.

The usual pattern: you memorise steadily for a few months, the amount you are
carrying grows, revision quietly falls behind, and one day you find that a surah you
worked on last year is gone. It did not go all at once — it went because nothing ever
told you it was due.

The tools that exist do not help much. A notebook cannot work out what is due today.
General flashcard apps can, but they are built for vocabulary, and they get hifz
wrong in ways that matter — a lost portion is not a lost flashcard, and shuffling
your revision into "most overdue first" order is actively unhelpful when the text
sits in your memory in the order it was revealed.

This app does one thing: it tells you what to recite today, and it keeps an honest
count of what you actually hold.

## What it does

- Track memorised portions — a whole surah, or an ayah range within one.
- A revision schedule built for hifz: three grades (**solid / shaky / lost**), a
  lapse drops a portion back to a one-day interval, and the day's queue comes back
  **in Qur'anic order**, not most-overdue-first.
- An honest progress count out of all 6,236 ayahs, which **cannot exceed 100%** no
  matter how your portions overlap.
- A seven-day view of what is coming, so you can see a heavy Thursday before you take
  on a new surah rather than after.
- A nudge when a portion has been lost several times and is worth re-learning
  properly instead of being cycled forever.
- Suggests short surahs you have not started yet.

The app tracks *what you have memorised*, not the text itself — so it ships the shape
of the book (114 surahs and their ayah counts) in one file and needs no Qur'an API,
no key and no network.

## Setup

Requires **Node 20+** and **pnpm**.

```bash
git clone https://github.com/bytheitc/hifz.git
```

```bash
cd hifz
```

```bash
pnpm install
```

```bash
pnpm dev
```

Open <http://localhost:3000>. There is no `.env`, no API key, no database and nothing
to request access to.

### Other commands

```bash
pnpm test
```

```bash
pnpm typecheck
```

```bash
pnpm build
```

## Design decisions

**Nothing leaves the device.** What a person has and has not memorised of the Qur'an
is about as personal as data gets, and no feature here needs a server. Everything is
in `localStorage`. The right answer to "what if I change phone" is file export (see
[ISSUES.md](./ISSUES.md)), not an account.

**Three grades, not six.** Asking someone to rate recall from 0 to 5 right after
reciting invites noise. "Solid", "shaky" and "lost" are distinctions a person can
actually make. Solid advances the interval, shaky holds it, lost returns to one day.

**The queue is in Qur'anic order.** Every scheduler worth the name sorts by urgency.
People revising hifz do not — they go in order, because that is how the text sits in
memory. We take the small theoretical loss.

**Overlapping portions are merged before anything is counted.** Memorise Al-Mulk
1–10, later add Al-Mulk 1–30 without deleting the first, and a naive sum reports 40
ayahs in a 30-ayah surah. A progress bar reading over 100% destroys trust in every
other number on the page, so [`lib/progress.ts`](./lib/progress.ts) always counts
distinct ayahs.

**Dates are `YYYY-MM-DD` strings, not timestamps.** Time of day has no meaning in a
daily revision schedule, and a timestamp would make "due today" depend on the user's
timezone.

**Intervals have a long tail** (1, 3, 7, 16, 35, 90 days). Fresh hifz decays fast, so
the first gaps are tight. The tail is long because asking for a settled portion
weekly forever makes the daily load grow without bound until the student gives up —
which is the most common way these systems fail.

## Contributing

This is one of four projects indexed at **[https://github.com/mssnunilag/oss](https://github.com/mssnunilag/oss)** — the others cover prayer times, Qur'an memorisation, halal food and zakat, and share this one's conventions.

Please read [CONTRIBUTING.md](./CONTRIBUTING.md). Drafted starter tasks are in
[ISSUES.md](./ISSUES.md).

Built for Hacktoberfest by [MSSN UNILAG](https://github.com/bytheitc). Not an official MSSN
product, and it uses none of the society's data.

## Licence

[MIT](./LICENSE).
