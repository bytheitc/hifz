"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { describePortion } from "@/lib/quran";
import {
  type Grade,
  type TrackedPortion,
  dueOn,
  toDateOnly,
  upcomingLoad,
} from "@/lib/srs";
import type { Recorder } from "@/lib/grading";
import { trailOf } from "@/lib/halaqah";
import { type AccountStatus, accountsConfigured, describeWhereDataLives } from "@/lib/account";
import { readAccountEmail, readAccountSubject, readToken, signOut, trailTransport } from "@/lib/api";
import { describeSync, syncOwnTrail } from "@/lib/sync";
import { SyncPanel } from "@/components/SyncPanel";
import { computeProgress, suggestNext } from "@/lib/progress";
import { troubleSpots, worstTroubleSpot } from "@/lib/trouble";
import { coach } from "@/lib/coach";
import {
  type AppState,
  addPortion,
  addStudent,
  currentPortions,
  emptyState,
  loadState,
  recordGrade,
  removePortion,
  replacePortions,
  saveState,
  takeInTrail,
  undoLastGrade,
} from "@/lib/store";
import { Coach } from "@/components/Coach";
import { TroubleSpotCard } from "@/components/TroubleSpotCard";
import { DueList } from "@/components/DueList";
import { ProgressCard } from "@/components/ProgressCard";
import { WeekAhead } from "@/components/WeekAhead";
import { AddPortionForm } from "@/components/AddPortionForm";
import { TrailList } from "@/components/TrailList";
import { BackupControls } from "@/components/BackupControls";
import { StudentRoster } from "@/components/StudentRoster";
import { TeacherNotes, type TeacherNote } from "@/components/TeacherNotes";

/** A small starting trail, so the first load shows what the app is for
 *  instead of an empty page with a form on it. Cleared with one button. */
function sampleTrail(today: string): TrackedPortion[] {
  return [
    { id: "s1", surah: 1, fromAyah: 1, toAyah: 7, box: 4, lastReviewed: today, addedOn: "2024-09-01", lapses: 0 },
    { id: "s2", surah: 67, fromAyah: 1, toAyah: 30, box: 2, lastReviewed: "2026-10-20", addedOn: "2026-02-10", lapses: 1 },
    { id: "s3", surah: 36, fromAyah: 1, toAyah: 40, box: 1, lastReviewed: "2026-10-25", addedOn: "2026-08-14", lapses: 3 },
    { id: "s4", surah: 78, fromAyah: 1, toAyah: 40, box: 0, lastReviewed: null, addedOn: "2026-10-29", lapses: 0 },
  ];
}

interface LastGrade {
  readonly portionId: string;
  readonly label: string;
  readonly grade: Grade;
}

export default function Home() {
  const [state, setState] = useState<AppState | null>(null);
  const [today, setToday] = useState<string | null>(null);
  const [chosenStudent, setChosenStudent] = useState<string | null>(null);
  const [lastGrade, setLastGrade] = useState<LastGrade | null>(null);
  /**
   * Who is signed in, as far as THIS browser is concerned.
   *
   * It cannot come from the server: a statically rendered page knows whether
   * accounts are configured but not whether the person looking at it has a
   * session, and asking it produced a page that told a signed-in student
   * their trail stayed on this device.
   */
  const [account, setAccount] = useState<AccountStatus>({ kind: "not-configured" });
  const [syncing, setSyncing] = useState(false);
  const [syncSaid, setSyncSaid] = useState<string | null>(null);
  const [syncFailed, setSyncFailed] = useState(false);
  const queueRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const date = toDateOnly(new Date());
    const loaded = loadState(date);
    // The sample trail is there so a first load shows what the app is for
    // rather than an empty form. It must not be seeded for someone who is
    // signed in: their real trail is about to arrive from the server, and
    // the first sync would otherwise push four portions of demo data up
    // into their account as though they had memorised them.
    const signedIn = Boolean(readToken());
    const empty =
      currentPortions(loaded, loaded.selfStudentId).length === 0 &&
      loaded.trails.every((trail) => trail.events.length === 0);
    const seeded =
      empty && !signedIn
        ? sampleTrail(date).reduce(
            (s, portion) => addPortion(s, loaded.selfStudentId, portion),
            loaded
          )
        : loaded;

    setState(seeded);
    setToday(date);

    if (!accountsConfigured()) {
      setAccount({ kind: "not-configured" });
    } else {
      const email = readToken() ? readAccountEmail() : null;
      if (!email) {
        setAccount({ kind: "signed-out" });
      } else {
        // "Synced" means bound to THIS account, not bound to anything. A
        // device holding someone else's bound trail would otherwise say
        // "Synced to <you>" over a record that is not yours.
        const bound = trailOf(seeded.trails, seeded.selfStudentId).boundAccount;
        const mine = bound !== null && bound === readAccountSubject();
        setAccount({ kind: mine ? "synced" : "signed-in", email });
      }
    }
  }, []);

  useEffect(() => {
    if (state) saveState(state);
  }, [state]);

  /** Everyone the teacher hears. The self trail is kept out of the register:
   *  a teacher's own hifz is not one of their students. */
  const roster = useMemo(
    () =>
      state ? state.students.filter((s) => s.id !== state.selfStudentId) : [],
    [state]
  );

  /** Whose trail is on screen. In solo mode there is only ever one answer;
   *  in teacher mode it falls back to the first student so that selecting a
   *  student who was then removed does not blank the page. */
  const activeId = useMemo(() => {
    if (!state) return null;
    if (state.mode === "solo") return state.selfStudentId;
    if (chosenStudent && roster.some((s) => s.id === chosenStudent)) {
      return chosenStudent;
    }
    return roster[0]?.id ?? null;
  }, [state, chosenStudent, roster]);

  const portions = useMemo(
    () => (state && activeId ? currentPortions(state, activeId) : []),
    [state, activeId]
  );

  const dueCounts = useMemo(() => {
    if (!state || !today) return {};
    const counts: Record<string, number> = {};
    for (const student of roster) {
      counts[student.id] = dueOn(currentPortions(state, student.id), today).length;
    }
    return counts;
  }, [state, roster, today]);

  const due = useMemo(() => (today ? dueOn(portions, today) : []), [portions, today]);
  const progress = useMemo(() => computeProgress(portions), [portions]);
  const load = useMemo(
    () => (today ? upcomingLoad(portions, today, 7) : []),
    [portions, today]
  );
  const suggestions = useMemo(() => suggestNext(portions, 5), [portions]);

  const spots = useMemo(
    () => (today ? troubleSpots(portions, today, 3) : []),
    [portions, today]
  );
  const worstSpot = useMemo(
    () => (today ? worstTroubleSpot(portions, today) : null),
    [portions, today]
  );
  const troubleIds = useMemo(
    () => new Set(spots.map((spot) => spot.portion.id)),
    [spots]
  );

  const dueAyahs = useMemo(
    () => due.reduce((sum, p) => sum + (p.toAyah - p.fromAyah + 1), 0),
    [due]
  );

  const gradedToday = useMemo(
    () => portions.filter((portion) => portion.lastReviewed === today).length,
    [portions, today]
  );

  const heaviestAhead = useMemo(() => {
    const ahead = load.slice(1);
    if (ahead.length === 0) return null;
    const worst = ahead.reduce((a, b) => (b.ayahs > a.ayahs ? b : a));
    return worst.ayahs > 0 ? { date: worst.date, ayahs: worst.ayahs } : null;
  }, [load]);

  const said = useMemo(
    () =>
      today
        ? coach({
            today,
            trailSize: portions.length,
            dueCount: due.length,
            dueAyahs,
            gradedToday,
            percent: progress.percent,
            worstSpot,
            heaviestAhead,
          })
        : null,
    [today, portions.length, due.length, dueAyahs, gradedToday, progress.percent, worstSpot, heaviestAhead]
  );

  /** Who is recording. In a halaqah the teacher heard the recitation, and the
   *  log says so — that is what lets their assessment take precedence over a
   *  student's own for the same day. */
  const recorder: Recorder = useMemo(
    () =>
      state?.mode === "teacher"
        ? { kind: "teacher", teacherId: state.teacher?.id ?? "teacher" }
        : { kind: "self" },
    [state?.mode, state?.teacher?.id]
  );

  const grade = useCallback(
    (portion: TrackedPortion, value: Grade) => {
      if (!today || !activeId) return;
      setLastGrade({
        portionId: portion.id,
        label: describePortion(portion),
        grade: value,
      });
      setState((prev) =>
        prev ? recordGrade(prev, activeId, portion.id, value, today, recorder) : prev
      );
    },
    [today, activeId, recorder]
  );

  const undo = useCallback(() => {
    setLastGrade((last) => {
      if (last && activeId) {
        setState((prev) =>
          prev ? undoLastGrade(prev, activeId, last.portionId) : prev
        );
      }
      return null;
    });
  }, [activeId]);

  /**
   * Keyboard grading, for the desktop half of this. Someone working through
   * twenty portions recites, then presses a key - they should never have to
   * find three small buttons with a mouse for every row. The keys act on the
   * top of the queue because the queue is in Qur'anic order and that is the
   * order the work is actually done in, so "the next one" is never ambiguous.
   *
   * Guarded against firing while the student is typing in the add-portion
   * form, where "1" means the number one.
   */
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "SELECT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      const grades: Record<string, Grade> = { "1": "solid", "2": "shaky", "3": "lost" };
      const chosen = grades[event.key];
      if (chosen && due.length > 0) {
        event.preventDefault();
        grade(due[0], chosen);
        return;
      }
      if (event.key.toLowerCase() === "u") {
        event.preventDefault();
        undo();
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [due, grade, undo]);

  if (!state || !today || !said) {
    // One frame before hydration. Rendering the sample trail and then
    // replacing it with the stored one caused a visible flash of someone
    // else's hifz, which is a strange thing to show a person.
    return <main className="min-h-dvh" aria-busy="true" />;
  }

  async function sync() {
    const subject = readAccountSubject();
    // `state` is non-null by the time this can be called, but the narrowing
    // from the render guard does not reach inside a closure.
    if (!state || !subject || syncing) return;

    setSyncing(true);
    setSyncSaid(null);
    setSyncFailed(false);

    const outcome = await syncOwnTrail(state, trailTransport(), subject);

    if (outcome.ok) {
      setState(outcome.state);
      setAccount((held) =>
        held.kind === "signed-in" || held.kind === "synced"
          ? { kind: "synced", email: held.email }
          : held
      );
    }

    setSyncFailed(!outcome.ok);
    setSyncSaid(describeSync(outcome));
    setSyncing(false);
  }

  function endSession() {
    signOut();
    setAccount({ kind: "signed-out" });
    setSyncSaid(null);
    setSyncFailed(false);
  }

  const teaching = state.mode === "teacher";
  const activeStudent = roster.find((s) => s.id === activeId) ?? null;
  /** Baselines and the grade log: what a file carries, as against the folded
   *  portions the screen shows. */
  const activeTrail = activeId
    ? trailOf(state.trails, activeId)
    : { studentId: "", subjectId: null, portions: [], events: [] };

  /**
   * The last thing the teacher said about each portion, for the student's own
   * view. Without it a portion silently drops to box 0 after a file arrives
   * and the student has no way to tell a teacher's assessment from a bug -
   * which is the difference between feedback and a glitch.
   */
  const teacherSaid = new Map<string, { grade: Grade; on: string }>();
  if (!teaching) {
    for (const event of activeTrail.events) {
      if (event.by.kind !== "teacher") continue;
      const held = teacherSaid.get(event.portionId);
      if (!held || held.on <= event.on) {
        teacherSaid.set(event.portionId, { grade: event.grade, on: event.on });
      }
    }
  }

  // Shown on its own rather than only in the queue: a portion the teacher
  // marked lost is not due again until tomorrow, so the queue is exactly
  // where the student would not find it.
  const teacherNotes: TeacherNote[] = [...teacherSaid.entries()]
    .map(([portionId, said]) => {
      const portion = portions.find((p) => p.id === portionId);
      return portion ? { portion, grade: said.grade, on: said.on } : null;
    })
    .filter((note): note is TeacherNote => note !== null)
    .sort((a, b) => b.on.localeCompare(a.on))
    .slice(0, 4);

  function setMode(mode: AppState["mode"]) {
    setState((prev) => (prev ? { ...prev, mode } : prev));
    setLastGrade(null);
  }

  return (
    <main className="mx-auto min-h-dvh w-full max-w-5xl px-4 pb-28 pt-6 sm:px-6 sm:pb-12 sm:pt-10">
      <header className="mb-5 flex items-baseline justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Hifz Trail</h1>
        <div className="flex items-center gap-3">
          {/* Not written out here on purpose. The sentence comes from the
              account layer, so that the day a trail starts syncing it cannot
              be left behind claiming something that has stopped being true. */}
          <p className="hidden text-right text-[11px] text-[var(--color-ink-soft)] sm:block dark:text-white/50">
            {describeWhereDataLives(account)}
          </p>
          <div
            role="group"
            aria-label="Mode"
            className="flex rounded-lg border border-[var(--color-rule)] p-0.5 dark:border-white/15"
          >
            {(["solo", "teacher"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setMode(mode)}
                aria-pressed={state.mode === mode}
                className={`rounded-md px-2.5 py-1 text-[11px] ${
                  state.mode === mode
                    ? "bg-[var(--color-brand)] text-white"
                    : "text-[var(--color-ink-soft)] dark:text-white/55"
                }`}
              >
                {mode === "solo" ? "Just me" : "Teaching"}
              </button>
            ))}
          </div>
        </div>
      </header>

      {teaching && (
        <div className="mb-5">
          <StudentRoster
            students={roster}
            activeId={activeId ?? ""}
            dueCounts={dueCounts}
            onSelect={setChosenStudent}
            // Selecting the new student happens out here, not inside a
            // setState updater. An updater has to be a pure function of the
            // previous state - React calls it more than once in development,
            // and a setState buried in one lands unreliably. That is exactly
            // what went wrong first: adding a second student left the first
            // one selected, so a teacher adding someone mid-session would
            // have started grading the wrong child.
            onAdd={(name) => {
              const { state: next, student } = addStudent(state, name, today);
              setState(next);
              setChosenStudent(student.id);
            }}
          />
        </div>
      )}

      {teaching && !activeId ? (
        <p className="rounded-2xl border border-dashed border-[var(--color-rule)] p-5 text-sm text-[var(--color-ink-soft)] dark:border-white/15 dark:text-white/55">
          Add a student to begin. What you record here is your assessment, and
          it takes precedence over their own for the day.
        </p>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-6">
          <div className="space-y-5">
            {teaching && activeStudent ? (
              <div className="rounded-2xl border border-[var(--color-rule)] px-4 py-3 dark:border-white/10">
                <p className="text-sm font-medium">{activeStudent.name}</p>
                <p className="mt-0.5 text-xs text-[var(--color-ink-soft)] dark:text-white/50">
                  Grading as the teacher. What you record stands for today.
                </p>
              </div>
            ) : (
              <Coach said={said} />
            )}

            {!teaching && <TeacherNotes notes={teacherNotes} />}

            {worstSpot && (
              <TroubleSpotCard
                spot={worstSpot}
                onJump={() =>
                  queueRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
                }
              />
            )}

            <section ref={queueRef} className="scroll-mt-4">
              <div className="mb-2.5 flex items-baseline justify-between gap-3">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-soft)] dark:text-white/55">
                  Due today{due.length > 0 && ` · ${due.length}`}
                </h2>
                <p className="hidden text-[11px] text-[var(--color-ink-soft)] sm:block dark:text-white/45">
                  Keys 1 solid, 2 shaky, 3 lost, U undo
                </p>
              </div>

              {due.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-[var(--color-rule)] p-5 text-sm text-[var(--color-ink-soft)] dark:border-white/15 dark:text-white/55">
                  {gradedToday > 0
                    ? "Queue clear. Nothing else is asking for you today."
                    : portions.length === 0
                      ? "Nothing tracked yet. Add a portion below to begin."
                      : "Nothing due today."}
                </p>
              ) : (
                <DueList
                  portions={due}
                  today={today}
                  troubleIds={troubleIds}
                  teacherSaid={teacherSaid}
                  onGrade={grade}
                />
              )}
            </section>

            {spots.length > 1 && (
              <section>
                <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-soft)] dark:text-white/55">
                  Also worth re-learning
                </h2>
                <ul className="space-y-1.5">
                  {spots.slice(1).map((spot) => (
                    <li
                      key={spot.portion.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-[var(--color-rule)] px-3 py-2 text-sm dark:border-white/10"
                    >
                      <span className="min-w-0 truncate">
                        {describePortion(spot.portion)}
                      </span>
                      <span className="shrink-0 text-xs text-[var(--color-ink-soft)] dark:text-white/50">
                        {spot.portion.lapses} lapses
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-[var(--color-ink-soft)] dark:text-white/50">
                  Another week of revision is unlikely to fix what did not settle the
                  first time.
                </p>
              </section>
            )}
          </div>

          <div className="space-y-5 lg:sticky lg:top-6">
            <ProgressCard progress={progress} />
            <WeekAhead load={load} />

            <section>
              <div className="mb-2.5 flex items-center justify-between gap-3">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-soft)] dark:text-white/55">
                  {teaching && activeStudent
                    ? `${activeStudent.name}'s trail`
                    : "Your trail"}
                </h2>
                <button
                  type="button"
                  onClick={() =>
                    setState((prev) =>
                      prev && activeId ? replacePortions(prev, activeId, []) : prev
                    )
                  }
                  className="rounded-lg border border-[var(--color-rule)] px-2.5 py-1 text-[11px] text-[var(--color-ink-soft)] dark:border-white/15 dark:text-white/55"
                >
                  Clear everything
                </button>
              </div>

              <AddPortionForm
                onAdd={(portion) =>
                  setState((prev) =>
                    prev && activeId
                      ? addPortion(prev, activeId, {
                          ...portion,
                          box: 0,
                          lastReviewed: null,
                          addedOn: today,
                          lapses: 0,
                        })
                      : prev
                  )
                }
              />

              {portions.length > 0 && (
                <div className="mt-3">
                  <TrailList
                    portions={portions}
                    onRemove={(id) =>
                      setState((prev) =>
                        prev && activeId ? removePortion(prev, activeId, id) : prev
                      )
                    }
                  />
                </div>
              )}

              {/* Only for the person's own trail. A teacher's register of
                  other people's children is not something to put on a server
                  by accident, so it moves by file and nothing here offers
                  otherwise. */}
              {!teaching &&
                (account.kind === "signed-in" || account.kind === "synced") && (
                  <SyncPanel
                    email={account.email}
                    synced={account.kind === "synced"}
                    busy={syncing}
                    said={syncSaid}
                    failed={syncFailed}
                    onSync={sync}
                    onSignOut={endSession}
                  />
                )}

              <BackupControls
                portions={portions}
                trail={activeTrail}
                today={today}
                mode={state.mode}
                subject={
                  activeTrail.subjectId
                    ? {
                        id: activeTrail.subjectId,
                        // The teacher knows the student by name; a student's
                        // own device has no name for itself worth writing
                        // into a file.
                        name: teaching ? (activeStudent?.name ?? null) : null,
                      }
                    : null
                }
                // The merge happens here, not inside a setState updater, and
                // hands back its counts so the panel can say what actually
                // arrived rather than guessing.
                onTakeIn={(incoming) => {
                  if (!activeId) return null;
                  const result = takeInTrail(state, activeId, incoming);
                  if (!result.ok) {
                    return { ok: false, subjectName: result.subjectName };
                  }
                  setState(result.state);
                  return {
                    ok: true,
                    added: result.added,
                    alreadyHad: result.alreadyHad,
                    grades: result.grades,
                  };
                }}
              />
            </section>

            {suggestions.length > 0 && (
              <section>
                <h2 className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-soft)] dark:text-white/55">
                  Not started yet
                </h2>
                <p className="mb-2 text-xs text-[var(--color-ink-soft)] dark:text-white/50">
                  Shortest first, a good place to go next.
                </p>
                <ul className="flex flex-wrap gap-1.5">
                  {suggestions.map((item) => (
                    <li
                      key={item.number}
                      className="rounded-lg border border-[var(--color-rule)] px-2.5 py-1 text-xs dark:border-white/10"
                    >
                      {item.name}{" "}
                      <span className="text-[var(--color-ink-soft)] dark:text-white/50">
                        {item.ayahCount}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </div>
      )}

      {/* Undo rides above the home indicator on a phone. A mis-tapped "lost"
          resets a portion a student spent a month on, and asking them to
          re-grade it from memory is not a recovery. */}
      {lastGrade && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-10 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="pointer-events-auto mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-[var(--color-rule)] bg-[var(--color-card)] px-4 py-2.5 shadow-lg dark:border-white/15 dark:bg-[#23201a]">
            <p className="min-w-0 flex-1 truncate text-xs text-[var(--color-ink-soft)] dark:text-white/60">
              {lastGrade.label} marked {lastGrade.grade}
            </p>
            <button
              type="button"
              onClick={undo}
              className="min-h-9 shrink-0 rounded-lg bg-[var(--color-brand)] px-3 text-xs font-medium text-white active:opacity-80"
            >
              Undo
            </button>
            <button
              type="button"
              onClick={() => setLastGrade(null)}
              aria-label="Dismiss"
              className="min-h-9 shrink-0 px-1 text-xs text-[var(--color-ink-soft)] dark:text-white/50"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
