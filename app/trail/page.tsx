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
import { AppHeader } from "@/components/app/AppHeader";
import { HelpCenter, type HelpTopic } from "@/components/app/HelpCenter";
import { Onboarding, hasOnboarded } from "@/components/app/Onboarding";
import { CircleHelp, Plus, Sparkles } from "lucide-react";

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
  const [helpOpen, setHelpOpen] = useState(false);
  const [helpTopic, setHelpTopic] = useState<HelpTopic>("start");
  const [tourOpen, setTourOpen] = useState(false);

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
    // The welcome tour, once, on a first visit.
    if (!hasOnboarded()) setTourOpen(true);

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

  const openHelp = (topic: HelpTopic) => {
    setHelpTopic(topic);
    setHelpOpen(true);
  };
  const isSample =
    !teaching &&
    portions.length > 0 &&
    portions.every((p) => ["s1", "s2", "s3", "s4"].includes(p.id));
  const dateLabel = new Date(`${today}T12:00:00`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
  const sectionTitle = "eyebrow";

  return (
    <div className="min-h-dvh bg-[var(--color-wash)]">
      <AppHeader mode={state.mode} onMode={setMode} account={account} onHelp={() => openHelp("start")} />

      <main className="mx-auto w-full max-w-6xl px-4 pb-32 pt-6 sm:px-6 sm:pb-16 sm:pt-8">
        {isSample && (
          <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--color-brand)]/25 bg-[var(--color-brand-soft)] px-4 py-3 text-sm">
            <Sparkles className="size-4 shrink-0 text-[var(--color-brand)]" />
            <p className="min-w-0 flex-1">
              <strong>This is a sample trail</strong> so you can see how Hifz Trail works. Clear it when you are ready to add your own.
            </p>
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={() => setState((prev) => (prev && activeId ? replacePortions(prev, activeId, []) : prev))}
            >
              Start my own trail
            </button>
          </div>
        )}

        {teaching && (
          <div className="card mb-5 p-4 sm:p-5">
            <StudentRoster
              students={roster}
              activeId={activeId ?? ""}
              dueCounts={dueCounts}
              onSelect={setChosenStudent}
              // Selecting the new student happens out here, not inside a
              // setState updater: an updater must be pure, and React calls it
              // twice in development, so a setState inside one lands unreliably.
              onAdd={(name) => {
                const { state: next, student } = addStudent(state, name, today);
                setState(next);
                setChosenStudent(student.id);
              }}
            />
          </div>
        )}

        {teaching && !activeId ? (
          <div className="card grid place-items-center px-6 py-16 text-center">
            <p className="text-lg font-bold">Add your first student</p>
            <p className="mt-1 max-w-md text-[15px] text-[var(--color-ink-soft)]">
              Use Add student above. What you record is your assessment, and it takes precedence over their own for the day.
            </p>
            <button type="button" className="mt-4 text-sm font-bold text-[var(--color-brand)] hover:underline" onClick={() => openHelp("teaching")}>
              How teaching mode works
            </button>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
            <div className="space-y-6">
              {teaching && activeStudent ? (
                <div className="card flex items-center gap-3 p-4">
                  <span className="grid size-10 place-items-center rounded-xl bg-[var(--color-dawn-soft)] text-sm font-bold text-[var(--color-dawn-deep)]">
                    {activeStudent.name.slice(0, 1).toUpperCase()}
                  </span>
                  <div>
                    <p className="font-bold">{activeStudent.name}</p>
                    <p className="text-xs text-[var(--color-ink-soft)]">Grading as the teacher. What you record stands for today.</p>
                  </div>
                </div>
              ) : (
                <Coach
                  said={said}
                  dateLabel={dateLabel}
                  dueCount={due.length}
                  dueAyahs={dueAyahs}
                  done={gradedToday}
                  onStart={() => queueRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                />
              )}

              {!teaching && <TeacherNotes notes={teacherNotes} />}

              {worstSpot && (
                <TroubleSpotCard
                  spot={worstSpot}
                  onJump={() => queueRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                />
              )}

              <section ref={queueRef} className="scroll-mt-24" aria-labelledby="queue-title">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h2 id="queue-title" className="text-lg font-extrabold tracking-tight">
                    Today&apos;s queue{due.length > 0 && <span className="ml-2 text-[var(--color-ink-faint)]">{due.length}</span>}
                  </h2>
                  <button type="button" onClick={() => openHelp("grades")} className="flex items-center gap-1.5 text-sm font-semibold text-[var(--color-brand)] hover:underline">
                    <CircleHelp className="size-4" /> How to grade
                  </button>
                </div>

                {due.length === 0 ? (
                  <div className="card px-6 py-12 text-center">
                    <p className="text-lg font-bold">
                      {gradedToday > 0 ? "Queue clear. Well done." : portions.length === 0 ? "Your trail is empty" : "Nothing due today"}
                    </p>
                    <p className="mx-auto mt-1 max-w-sm text-[15px] text-[var(--color-ink-soft)]">
                      {gradedToday > 0
                        ? "Nothing else is asking for you today. Come back tomorrow."
                        : portions.length === 0
                          ? "Add the surahs you have memorised, and today's queue will appear here."
                          : "Everything on your trail is holding. Check the week ahead before adding something new."}
                    </p>
                    {portions.length === 0 && (
                      <a href="#add" className="btn btn-primary mt-5">
                        <Plus className="size-4" /> Add what you know
                      </a>
                    )}
                  </div>
                ) : (
                  <DueList portions={due} today={today} troubleIds={troubleIds} teacherSaid={teacherSaid} onGrade={grade} />
                )}
                {due.length > 0 && (
                  <p className="mt-3 hidden text-center text-xs text-[var(--color-ink-faint)] sm:block">
                    Keyboard: 1 solid, 2 shaky, 3 lost, U undo
                  </p>
                )}
              </section>

              {spots.length > 1 && (
                <section className="card p-5">
                  <h2 className={sectionTitle}>Also worth re-learning</h2>
                  <ul className="mt-3 divide-y divide-[var(--color-rule)]">
                    {spots.slice(1).map((spot) => (
                      <li key={spot.portion.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                        <span className="min-w-0 truncate font-semibold">{describePortion(spot.portion)}</span>
                        <span className="shrink-0 rounded-md bg-[var(--color-lost-soft)] px-2 py-0.5 text-xs font-semibold text-[var(--color-lost)]">
                          lost {spot.portion.lapses} times
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-sm text-[var(--color-ink-soft)]">Another week of revision is unlikely to fix what did not settle the first time.</p>
                </section>
              )}
            </div>

            <aside className="space-y-6 lg:sticky lg:top-24">
              <ProgressCard progress={progress} />
              <WeekAhead load={load} />

              <section id="add" className="card scroll-mt-24 p-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h2 className="font-extrabold">{teaching && activeStudent ? `${activeStudent.name}'s trail` : "Your trail"}</h2>
                  {portions.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm("Remove every portion from this trail? A backup file is the only way to bring them back.")) {
                          setState((prev) => (prev && activeId ? replacePortions(prev, activeId, []) : prev));
                        }
                      }}
                      className="text-xs font-semibold text-[var(--color-ink-faint)] hover:text-[var(--color-lost)]"
                    >
                      Clear everything
                    </button>
                  )}
                </div>
                <p className="mb-3 text-sm text-[var(--color-ink-soft)]">Add a surah, or part of one. Leave the last ayah empty for the whole surah.</p>

                <AddPortionForm
                  onAdd={(portion) =>
                    setState((prev) =>
                      prev && activeId
                        ? addPortion(prev, activeId, { ...portion, box: 0, lastReviewed: null, addedOn: today, lapses: 0 })
                        : prev
                    )
                  }
                />

                {portions.length > 0 && (
                  <div className="mt-4">
                    <TrailList
                      portions={portions}
                      onRemove={(id) => setState((prev) => (prev && activeId ? removePortion(prev, activeId, id) : prev))}
                    />
                  </div>
                )}

                {suggestions.length > 0 && (
                  <div className="mt-5 border-t border-[var(--color-rule)] pt-4">
                    <p className="text-sm font-bold">Ideas for what to learn next</p>
                    <p className="mb-2 text-xs text-[var(--color-ink-soft)]">The shortest surahs you have not started.</p>
                    <ul className="flex flex-wrap gap-1.5">
                      {suggestions.map((item) => (
                        <li key={item.number} className="rounded-lg bg-[var(--color-wash)] px-2.5 py-1 text-xs font-medium">
                          {item.name} <span className="text-[var(--color-ink-faint)]">{item.ayahCount}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>

              <section id="account" className="card scroll-mt-24 p-5">
                <h2 className="font-extrabold">Keep it safe</h2>
                {/* Only the person's own trail syncs. A teacher's register of other
                    people's children moves by file, and nothing here offers otherwise. */}
                {!teaching && (account.kind === "signed-in" || account.kind === "synced") ? (
                  <SyncPanel
                    email={account.email}
                    synced={account.kind === "synced"}
                    busy={syncing}
                    said={syncSaid}
                    failed={syncFailed}
                    onSync={sync}
                    onSignOut={endSession}
                  />
                ) : (
                  !teaching && (
                    <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
                      {describeWhereDataLives(account)}.{" "}
                      {account.kind === "signed-out" ? (
                        <>
                          <a href="/signup" className="font-bold text-[var(--color-brand)] hover:underline">Create a free account</a> to use it on every device.
                        </>
                      ) : (
                        "Save a backup file now and then."
                      )}
                    </p>
                  )
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
                          // The teacher knows the student by name; a student's own
                          // device has no name for itself worth writing into a file.
                          name: teaching ? (activeStudent?.name ?? null) : null,
                        }
                      : null
                  }
                  // The merge happens here, not inside a setState updater, and
                  // hands back its counts so the panel can say what arrived.
                  onTakeIn={(incoming) => {
                    if (!activeId) return null;
                    const result = takeInTrail(state, activeId, incoming);
                    if (!result.ok) {
                      return { ok: false, subjectName: result.subjectName };
                    }
                    setState(result.state);
                    return { ok: true, added: result.added, alreadyHad: result.alreadyHad, grades: result.grades };
                  }}
                />
              </section>
            </aside>
          </div>
        )}
      </main>

      {/* Undo rides above the home indicator on a phone. A mis-tapped "lost"
          resets a portion a student spent a month on. */}
      {lastGrade && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="pointer-events-auto mx-auto flex max-w-md items-center gap-3 rounded-2xl bg-[var(--color-ink)] px-4 py-3 text-white shadow-[var(--shadow-lift)]">
            <p className="min-w-0 flex-1 truncate text-sm">
              {lastGrade.label} marked <strong>{lastGrade.grade}</strong>
            </p>
            <button type="button" onClick={undo} className="min-h-9 shrink-0 rounded-lg bg-white/15 px-3 text-sm font-bold hover:bg-white/25">
              Undo
            </button>
            <button type="button" onClick={() => setLastGrade(null)} aria-label="Dismiss" className="min-h-9 shrink-0 px-1 text-sm text-white/70">
              Close
            </button>
          </div>
        </div>
      )}

      <HelpCenter
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        topic={helpTopic}
        onTopic={setHelpTopic}
        onReplayTour={() => {
          setHelpOpen(false);
          setTourOpen(true);
        }}
      />
      <Onboarding
        open={tourOpen}
        onClose={() => setTourOpen(false)}
        hasSample={isSample}
        onStartEmpty={() => setState((prev) => (prev && activeId ? replacePortions(prev, activeId, []) : prev))}
        accountsOpen={account.kind !== "not-configured"}
        signedIn={account.kind === "signed-in" || account.kind === "synced"}
      />
    </div>
  );
}
