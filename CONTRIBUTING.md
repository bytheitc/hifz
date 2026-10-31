# Contributing to Hifz Trail

Thanks for being here. This project exists to be contributed to.

## Before anything else

```bash
pnpm install
pnpm test
```

If those two commands do not both succeed on a fresh clone, that is a bug worth an
issue on its own. You should never need an API key, a `.env` file, a database, or
access to anything belonging to MSSN UNILAG.

## Picking something to work on

Start with [ISSUES.md](./ISSUES.md). Each entry says what the task is, roughly how
hard it is, and which files to look at. Comment on the matching GitHub issue to claim
it so two people do not do the same work.

For anything not listed, open an issue first. We would rather talk about an idea for
ten minutes than have you spend a weekend on something we then have to decline.

## House style

**Comments explain why, not what.** This is the convention we care about most.
`// merge the arrays` is noise; the comment at the top of
[`lib/progress.ts`](./lib/progress.ts) explains that portions overlap, that a naive
sum produces a progress bar reading over 100%, and why that single number destroys
trust in the whole page. Write the second kind.

**TypeScript, strict.** No `any`.

**Pure functions in `lib/`.** Everything in `lib/` is a pure function over plain data,
which is why it can be tested without a browser. React state belongs in `app/` and
`components/`.

**Dates are `"YYYY-MM-DD"` strings.** Do not introduce `Date` objects or timestamps
into the scheduler — see the README for why.

## Tests

Anything in `lib/` needs a test. The existing suites are the model: each test name is
a sentence about behaviour (`"counts overdue portions on the first day rather than
losing them"`), not a restatement of the function name. That particular test exists
because the bug it describes shipped and was caught in the browser — if you fix a
bug, leave a test behind that explains it.

```bash
pnpm test
pnpm test:watch
```

## A note on the Qur'an data

[`data/quran-meta.json`](./data/quran-meta.json) is the one file where a careless
edit does real damage: a one-digit typo in an ayah count silently skews every
percentage the app shows, and nobody would notice. There is a test asserting the
counts total 6,236 — the canonical figure for the Hafs reading. If you change that
file and the test fails, the change is wrong.

If you add data for another reading (`Warsh`, for instance, differs in numbering),
add it alongside rather than editing the Hafs numbers in place, and open an issue
first so we can agree how the app should let a user choose.

## A note on religious content

The scheduling here is a usability judgement, not a ruling. The interval table, the
three grades and the three-lapse re-learning threshold are all named constants
precisely so they read as choices rather than requirements. Please keep that framing:
the app should never appear to tell someone that a particular revision practice is
religiously required.

## Pull requests

- One topic per pull request.
- Say what problem it solves, not just what it changes.
- Run `pnpm test` and `pnpm typecheck` before pushing.
- Screenshots for anything visual.

Small and finished beats large and nearly-there.
