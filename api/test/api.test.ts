import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import app from "../index";
import { GradeEvent, Trail } from "../resources/trails/model";
import { clearDb, startDb, stopDb } from "./db";

beforeAll(startDb);
afterAll(stopDb);
beforeEach(clearDb);

const CREDENTIALS = { email: "aisha@example.org", password: "a-long-enough-passphrase" };

async function register(over: Partial<typeof CREDENTIALS> & { name?: string } = {}) {
  const res = await request(app).post("/auth/register").send({ ...CREDENTIALS, ...over });
  return res;
}

async function tokenFor(over = {}) {
  const res = await register(over);
  return res.body.token as string;
}

function portion(over: Record<string, unknown> = {}) {
  return {
    id: "p1",
    surah: 67,
    fromAyah: 1,
    toAyah: 30,
    box: 0,
    lastReviewed: null,
    addedOn: "2026-11-01",
    lapses: 0,
    ...over,
  };
}

function event(over: Record<string, unknown> = {}) {
  return {
    id: "e1",
    portionId: "p1",
    grade: "solid",
    on: "2026-11-10",
    recordedAt: "2026-11-10T08:00:00.000Z",
    by: { kind: "self" },
    ...over,
  };
}

describe("health", () => {
  it("answers", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});

describe("registering", () => {
  it("creates an account with a subject id of its own", async () => {
    const res = await register();

    expect(res.status).toBe(201);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.email).toBe(CREDENTIALS.email);
    expect(res.body.user.subjectId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("never returns the password hash", async () => {
    const res = await register();
    expect(JSON.stringify(res.body)).not.toContain("passwordHash");
    expect(JSON.stringify(res.body)).not.toContain(CREDENTIALS.password);
  });

  it("refuses a second account on the same email, whatever its casing", async () => {
    await register();
    const res = await register({ email: "AISHA@Example.org" });

    expect(res.status).toBe(409);
  });

  it("refuses a password short enough to guess", async () => {
    const res = await register({ password: "short" });
    expect(res.status).toBe(422);
  });

  it("refuses something that is not an email", async () => {
    const res = await register({ email: "not-an-email" });
    expect(res.status).toBe(422);
  });
});

describe("signing in", () => {
  it("works with the right password", async () => {
    await register();
    const res = await request(app).post("/auth/login").send(CREDENTIALS);

    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
  });

  it("gives the same answer for a wrong password and an unknown address", async () => {
    // Otherwise the login form becomes a way of asking which of these people
    // has an account here.
    await register();
    const wrongPassword = await request(app)
      .post("/auth/login")
      .send({ ...CREDENTIALS, password: "definitely-not-the-one" });
    const unknown = await request(app)
      .post("/auth/login")
      .send({ email: "nobody@example.org", password: "definitely-not-the-one" });

    expect(wrongPassword.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(unknown.body.error).toBe(wrongPassword.body.error);
  });
});

describe("who you are", () => {
  it("refuses with no token", async () => {
    expect((await request(app).get("/auth/me")).status).toBe(401);
  });

  it("refuses a token that was not signed by us", async () => {
    const res = await request(app)
      .get("/auth/me")
      .set("Authorization", "Bearer not.a.real.token");

    expect(res.status).toBe(401);
  });

  it("answers with the account for a real token", async () => {
    const token = await tokenFor();
    const res = await request(app).get("/auth/me").set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(CREDENTIALS.email);
  });
});

describe("a trail", () => {
  it("exists and is empty for a new account", async () => {
    const token = await tokenFor();
    const res = await request(app).get("/trails/me").set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.portions).toEqual([]);
    expect(res.body.events).toEqual([]);
    expect(res.body.subjectId).toBeTruthy();
  });

  it("cannot be read without signing in", async () => {
    expect((await request(app).get("/trails/me")).status).toBe(401);
  });

  it("takes on portions the device has", async () => {
    const token = await tokenFor();
    const res = await request(app)
      .post("/trails/me/portions")
      .set("Authorization", `Bearer ${token}`)
      .send({ portions: [portion(), portion({ id: "p2", surah: 36, toAyah: 40 })] });

    expect(res.status).toBe(200);
    expect(res.body.added).toBe(2);
  });

  it("leaves a stored baseline alone when the same portion is sent again", async () => {
    // The device may have folded its grades in before sending. Overwriting a
    // baseline with a folded result would count those grades twice.
    const token = await tokenFor();
    const auth = { Authorization: `Bearer ${token}` };

    await request(app).post("/trails/me/portions").set(auth).send({ portions: [portion({ box: 0 })] });
    const second = await request(app)
      .post("/trails/me/portions")
      .set(auth)
      .send({ portions: [portion({ box: 4, lastReviewed: "2026-11-12" })] });

    expect(second.body.added).toBe(0);
    const trail = await request(app).get("/trails/me").set(auth);
    expect(trail.body.portions).toHaveLength(1);
    expect(trail.body.portions[0].box).toBe(0);
  });

  it("refuses a portion the app itself would not have created", async () => {
    const token = await tokenFor();
    const res = await request(app)
      .post("/trails/me/portions")
      .set("Authorization", `Bearer ${token}`)
      .send({ portions: [portion({ fromAyah: 30, toAyah: 1 })] });

    expect(res.status).toBe(422);
  });

  it("refuses a surah that does not exist", async () => {
    const token = await tokenFor();
    const res = await request(app)
      .post("/trails/me/portions")
      .set("Authorization", `Bearer ${token}`)
      .send({ portions: [portion({ surah: 200 })] });

    expect(res.status).toBe(422);
  });
});

describe("grades", () => {
  it("are stored and read back in order", async () => {
    const token = await tokenFor();
    const auth = { Authorization: `Bearer ${token}` };

    const res = await request(app)
      .post("/trails/me/events")
      .set(auth)
      .send({
        events: [
          event({ id: "b", on: "2026-11-12" }),
          event({ id: "a", on: "2026-11-10" }),
        ],
      });

    expect(res.body.added).toBe(2);
    const trail = await request(app).get("/trails/me").set(auth);
    expect(trail.body.events.map((e: { id: string }) => e.id)).toEqual(["a", "b"]);
  });

  it("add nothing the second time the same log is sent", async () => {
    // A phone that loses signal mid-sync and retries must not double a
    // student's history.
    const token = await tokenFor();
    const auth = { Authorization: `Bearer ${token}` };
    const body = { events: [event({ id: "a" }), event({ id: "b", on: "2026-11-11" })] };

    const first = await request(app).post("/trails/me/events").set(auth).send(body);
    const second = await request(app).post("/trails/me/events").set(auth).send(body);

    expect(first.body.added).toBe(2);
    expect(second.body.added).toBe(0);
    expect(second.body.alreadyHad).toBe(2);
    expect(await GradeEvent.countDocuments({})).toBe(2);
  });

  it("takes the new ones from a log that partly overlaps", async () => {
    const token = await tokenFor();
    const auth = { Authorization: `Bearer ${token}` };

    await request(app).post("/trails/me/events").set(auth).send({ events: [event({ id: "a" })] });
    const res = await request(app)
      .post("/trails/me/events")
      .set(auth)
      .send({ events: [event({ id: "a" }), event({ id: "b", on: "2026-11-11" })] });

    expect(res.body.added).toBe(1);
    expect(res.body.alreadyHad).toBe(1);
  });

  it("keeps a teacher's grade distinguishable from the student's", async () => {
    const token = await tokenFor();
    const auth = { Authorization: `Bearer ${token}` };

    await request(app)
      .post("/trails/me/events")
      .set(auth)
      .send({
        events: [
          event({ id: "self-1" }),
          event({ id: "teacher-1", by: { kind: "teacher", teacherId: "t1" } }),
        ],
      });

    const trail = await request(app).get("/trails/me").set(auth);
    const kinds = trail.body.events.map((e: { by: { kind: string } }) => e.by.kind).sort();
    expect(kinds).toEqual(["self", "teacher"]);
  });

  it("refuses a grade that is not one of the three", async () => {
    const token = await tokenFor();
    const res = await request(app)
      .post("/trails/me/events")
      .set("Authorization", `Bearer ${token}`)
      .send({ events: [event({ grade: "excellent" })] });

    expect(res.status).toBe(422);
  });
});

describe("one account cannot see another's", () => {
  it("keeps trails and grades apart", async () => {
    const aisha = await tokenFor();
    const umar = await tokenFor({ email: "umar@example.org" });

    await request(app)
      .post("/trails/me/portions")
      .set("Authorization", `Bearer ${aisha}`)
      .send({ portions: [portion()] });
    await request(app)
      .post("/trails/me/events")
      .set("Authorization", `Bearer ${aisha}`)
      .send({ events: [event()] });

    const theirs = await request(app)
      .get("/trails/me")
      .set("Authorization", `Bearer ${umar}`);

    expect(theirs.body.portions).toEqual([]);
    expect(theirs.body.events).toEqual([]);
    expect(await Trail.countDocuments({})).toBe(2);
  });

  it("lets two accounts use the same event id without colliding", async () => {
    // Ids are minted per device, so two students can easily mint the same
    // one. The uniqueness that matters is per account.
    const aisha = await tokenFor();
    const umar = await tokenFor({ email: "umar@example.org" });

    const a = await request(app)
      .post("/trails/me/events")
      .set("Authorization", `Bearer ${aisha}`)
      .send({ events: [event({ id: "same-id" })] });
    const u = await request(app)
      .post("/trails/me/events")
      .set("Authorization", `Bearer ${umar}`)
      .send({ events: [event({ id: "same-id" })] });

    expect(a.body.added).toBe(1);
    expect(u.body.added).toBe(1);
  });
});
