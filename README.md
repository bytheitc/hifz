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
- **A trouble spot**, named. The app ranks what is actually going wrong rather
  than listing anything past three lapses: a portion lost three times in two
  months and still at a one-day interval is a live problem, and the same three
  lapses spread over four years with the portion now settled is history. The
  worst one is the first thing on the page.
- **A coach** that reads the day's numbers and says the useful sentence - which
  portion to start with, that Thursday is heavier than today, that the queue is
  clear. It runs on the device, has no model behind it, and is incapable of
  encouraging you about progress you have not made.
- Suggests short surahs you have not started yet.

## Teaching a halaqah

The app has two modes, switched in the header. **Just me** is the original
app, unchanged. **Teaching** holds a register of students, each with their own
trail, and grades them as the teacher.

This matters because of who is doing the assessing. A student revising alone
grades themselves, which is the only option available to them. In a halaqah
the teacher hears the recitation, and their judgement is the one worth
recording - so a grade now carries who gave it, and on a day the teacher
graded a portion the student's own grade for that day is kept but does not
move the schedule. A student who marks Al-Mulk solid in the morning and
stumbles through it at halaqah that evening ends the day on what the teacher
heard. On days the teacher was not there, the student's own revision counts
normally, because that is the whole point of revising between sessions.

Everything is still local. Teaching mode is a teacher's own device holding
their students' trails, with no accounts and no server, which is as far as
this goes until there is a reason to go further.

### Handing a trail to a teacher

There is no server, so the file is the sync. A student saves a copy on their
own phone and sends it over however they already send things; the teacher
takes it in against that student's name. It is version 2 of the same backup
file, now carrying the grade log as well as the portions, and version 1 files
still read as a trail whose history is simply not known.

The difficult part is not merging, it is that the two devices disagree about
what things are called. The student's phone minted its own ids; the teacher's
copy of the same Al-Mulk 1-30 has a different one. So portions are matched by
their range and every incoming grade is re-pointed at whatever the teacher's
device calls that portion. Matching by id would hand the teacher a second copy
of everything the student owns, with the new grades piling onto the duplicates
while the originals sat still.

One existing portion can absorb at most one incoming portion. A student who
tracks An-Nas three times has three records, and collapsing them into the
teacher's single one would lose two.

Taking the same file in twice adds nothing: grades keep the ids of the device
that recorded them, so the union is idempotent. Grades the teacher recorded in
halaqah are never touched, and still take precedence for the days they heard
the student.

### Sending it back

The same mechanism runs in reverse: the teacher saves a copy of a student's
record and the student takes it in. Their teacher's grades arrive, along with
any portion the teacher set in halaqah, and stand for the days they were
heard.

Two things make that safe rather than merely possible.

**A file says whose record it is.** Your own trail carries a subject id from
the start; a trail a teacher opens for a student has none until that student's
own file arrives, because a name on a register is not yet a claim about whose
hifz it is. A file whose subject disagrees with the trail it is being put into
is refused by name - "That file is Aisha's record, not this one" - because the
usual cause is two files in the same folder, and merging someone else's hifz
into your own would be close to unpickable afterwards. Files that make no
claim, which is every version 1 file, are taken at face value.

**The student is told what the teacher said.** A grade from someone who heard
you recite is a different kind of fact from one you gave yourself, so it is
shown on its own, attributed and dated. This was first written as a line
inside the day's queue, which failed in exactly the case that matters: a
portion marked lost is not due again until tomorrow, so the queue is empty and
the student would find a portion silently reset to box 0 with no way to tell
an assessment from a glitch.

### Grades are events, not state

A grade is appended to a log; a portion's state is that log folded through the
scheduler. Two rules keep this honest, and breaking either corrupts people's
progress silently:

- **A stored portion is a baseline.** It is what the portion looked like
  before the log begins, and the folded result is never written back over it.
  Write folded state into a baseline and the next fold applies the same grades
  a second time.
- **Trails from before the log keep their progress.** They carry a real box
  and lapse count and no history that could rebuild it, so their baseline is
  simply what they already had, with an empty log.

The reason for the log rather than overwriting the portion is that two people
can now grade the same portion, and two devices may one day need to merge.
Appended events merge as a set union with no conflicts to resolve, which is
the seam any future sync plugs into.

## The three pages

| Route | What it is |
| --- | --- |
| `/` | The landing page, with the opening mushaf |
| `/trail` | The app itself, exactly as it was |
| `/signin` | Accounts, and an honest account of why they are not open yet |

Someone who already has a trail is not a visitor being persuaded, so the
landing page's main button says "Continue your trail" rather than "Start". It
does not redirect them past the page: a front door that bounces you is
infuriating when you came to read it.

### The animation

One animation in the whole project, and it is on the page seen once rather
than in the app used every day. Motion that would be an irritation on the
fiftieth viewing is what carries the first.

It is CSS rather than JavaScript, so it runs off the main thread while the
rest of the page is still arriving, and it animates `transform` and `opacity`
only. The open book is the *base* state and the animation runs from closed,
so a reader with reduced motion - or with animations off entirely - gets an
open mushaf rather than one stuck shut. The content never depends on the
animation having run.

The lines fill from the right, because that is the direction the script they
stand in for is read in, and they are ragged on the left for the same reason.
They are abstract on purpose: there is no Qur'anic text anywhere in the
animation. Setting actual revelation in motion as page decoration is not
something this project will do, and a suggestion of text carries the idea
perfectly well.

## The api

`./api` is a separate package: Express and MongoDB, in the resource layout
the rest of these projects use.

```
api/
  index.ts                 the app, assembled and exported
  database.ts              one cached connection, reused
  config/config.ts         the environment, read once and frozen
  middlewares/auth.ts      puts the signed-in account on the request
  resources/
    auth/                  controller, interface, model, router, service, validator
    trails/                the same six
```

Run it against a throwaway database with `pnpm dev:memory` - an in-memory
mongod, started and discarded with the process. It is for seeing the flow
work, not for keeping anything.

### What the api does and does not do

It stores and it identifies. It does not fold.

- `GET /trails/me` returns baselines and the whole grade log.
- `POST /trails/me/portions` takes on portions the account does not have,
  and leaves the baseline of one it already has exactly alone. The device
  sending them may have folded its grades in first, and overwriting a
  baseline with a folded result would count every one of those grades twice.
- `POST /trails/me/events` appends grades. A unique index on
  `(user, eventId)` is what makes sending the same log twice a no-op, so a
  phone that loses signal mid-sync and retries cannot double a student's
  history.

Working out what a box is today stays in the app, where it is already
written and tested. The log is deterministic, so the api has no reason to
have an opinion about it.

There is deliberately no `:userId` in any path. A trail is reached by being
the person whose trail it is, and the only identity that counts is the one
in the token - never a id in a URL or a body.

## Sync

A signed-in person can carry their own trail between their devices. One
button, not a background process: revision happens on patchy connections,
and a silent sync that failed looks exactly like one that worked.

There is no merge algorithm here worth the name, which is the point. Both
rules were already built and tested for files moving by hand - portions
matched by range because ids are minted per device, grades unioned by their
own id because they are never edited. Sync points those at a server instead
of a file, so a phone that has been offline for a week needs no
reconciliation when it comes back.

It pulls, merges, then pushes. Pulling first means a sync interrupted halfway
has taken work in rather than half-sent it, and the push carries everything
including what was just pulled, because the server skips what it already has
on both halves. Sending a little more than necessary removes a whole class of
bug about what is already up there.

**Only the signed-in person's own trail.** A teacher's register of other
people's children stays on their device and moves by file. Putting it on a
server is a decision with consent and retention attached, and it is not one
to make by accident.

### Binding

A trail's subject id is minted on the device; an account's is minted at
registration. For the same person they always differ, so the first sync binds
the two - without it the provenance guard reads the server's copy as somebody
else's hifz and refuses it, correctly, on the evidence it has.

Signing a second account into a device that already holds a bound trail is
refused rather than merged. Two people's hifz in one record cannot be taken
apart again. For the same reason a device that is already signed in does not
seed the sample trail: the first sync would otherwise push four portions of
demo data into a real account as though they had been memorised.

The line in the header says "not synced yet" until this device's trail has
actually reached the server under *this* account, and only then "Synced to
...". A student who believed it early would clear their browser and lose
everything.

## Accounts

Off, and the app is complete without them. Everything - the trail, the daily
queue, a halaqah register, handing records between a student and their
teacher - runs on the device.

Turning them on means pointing the web app at the api with
`NEXT_PUBLIC_API_URL` (see `.env.example`). One variable, because the api
holds its own secrets and the browser needs only an address. Until it is set
the app stays device-only.

`lib/account.ts` is the seam, and the sentence in the app header about where
a trail lives comes from there, so it cannot be left behind claiming
something that has stopped being true. It currently reads "still only on this
device" for a signed-in account, because that is the truth: signing in
creates an account and a session, and **no trail is uploaded yet**. That line
changes when sync does.

Three things are not optional before accounts open, and none of them is code:
consent from a guardian for students who are children, a written answer to how
long records are kept and how they are deleted, and that header line changing
in the same release that uploads anything - not after it.

## Keeping a copy

The trail lives in `localStorage`, which is the right home for it and the wrong
place to keep the only copy. **Save a copy** writes the whole trail to a dated
JSON file; **Restore** reads one back.

Restoring only ever adds. A portion already in the trail is left exactly as it
is, even when the file holds a different box or a later review date. That costs
something real - restoring a newer backup will not advance portions you already
have - and it buys the guarantee that matters more: picking the wrong file can
never undo revision work. The person reaching for Restore has usually just lost
data, and a merge that can also destroy it is not a backup.

Portions are matched by surah and ayah range, not by id. Ids are minted on the
device that created the portion, so the same Al-Mulk 1-30 carries one id on a
phone and another on a laptop; matching by id would hand the student a
duplicate of everything they own. A file is read before anything changes, so a
file that is not a backup, or one written by a newer version, is refused with a
sentence rather than half-imported.

## On a phone, and on a desktop

The same page, ordered differently, because the two are used differently.

On a phone it is one column in the order the question is actually asked: what
should I do, what is going wrong, then the work. Grade buttons are a full-width
row at least 44px tall, number fields open the number pad, the inputs are 16px
so iOS does not zoom the page on focus, and a mis-tapped grade can be undone
from a bar that sits above the home indicator. A lapse costs a real portion a
real reset; "re-grade it from memory" is not a recovery.

On a desktop the dashboard numbers move into a second, sticky column so they
are not something a thumb has to scroll past, and the day's revision is graded
from the keyboard: **1** solid, **2** shaky, **3** lost, **U** undo. The keys
act on the top of the queue, because the queue is in Qur'anic order and that is
the order the work is done in, so "the next one" is never ambiguous.

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

**The coach is a function, not a model.** It would have been easy to put a
language model behind the encouraging sentence at the top of the page, and it
would have cost the three things that matter most here. It would stop working
on a plane, in a masjid basement, and on the day the API is down - which is to
say, on the days a student actually needs it. It could invent a surah,
misremember a count, or be warm about a collapsing revision schedule. And it
could not be tested: something that is charming nine times in ten and tactless
the tenth does not belong between a person and their hifz. So
[`lib/coach.ts`](./lib/coach.ts) is a pure function from the student's own
numbers to a sentence, every line derived from a figure visible on the page,
and the test suite asserts the things a model could not promise - that it never
congratulates someone whose schedule is falling apart, that it says the same
thing all day rather than re-rolling on every render, and that it does not say
the same thing forever.

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
