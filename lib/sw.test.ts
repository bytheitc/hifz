/**
 * Tests for `public/sw.js`.
 *
 * The service worker is the one piece of this project that cannot be checked
 * by reading it: it is a background script with its own lifecycle, and the
 * rule it is built around is a negative one. "This response is never written
 * to disk" is not something you can see by looking at a cache.
 *
 * So the worker is loaded into a sandbox with a fake `caches`, a fake
 * network and a fake `self`, and asked to handle the requests that matter.
 * The test that counts is the first one: an api response must never be
 * stored, and a change that breaks that should fail here rather than on
 * somebody's phone.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { beforeEach, describe, expect, it } from "vitest";

const SOURCE = readFileSync(
  fileURLToPath(new URL("../public/sw.js", import.meta.url)),
  "utf8"
);

const ORIGIN = "https://hifz.example";

type FakeRequest = { method: string; url: string; mode?: string; headers?: Headers };

class FakeCache {
  readonly entries = new Map<string, string>();

  async match(request: FakeRequest | string) {
    const key = typeof request === "string" ? absolute(request) : request.url;
    const body = this.entries.get(key);
    return body === undefined ? undefined : new Response(body);
  }

  async put(request: FakeRequest | string, response: Response) {
    const key = typeof request === "string" ? absolute(request) : request.url;
    this.entries.set(key, await response.text());
  }

  async add(path: string) {
    this.entries.set(absolute(path), `precached ${path}`);
  }

  async keys() {
    return [...this.entries.keys()];
  }
}

function absolute(path: string): string {
  return new URL(path, ORIGIN).toString();
}

function load({ offline = false }: { offline?: boolean } = {}) {
  const storage = new Map<string, FakeCache>();
  const fetched: string[] = [];

  const caches = {
    async open(name: string) {
      const existing = storage.get(name);
      if (existing) return existing;
      const fresh = new FakeCache();
      storage.set(name, fresh);
      return fresh;
    },
    async keys() {
      return [...storage.keys()];
    },
    async delete(name: string) {
      return storage.delete(name);
    },
    async match(request: FakeRequest | string) {
      for (const cache of storage.values()) {
        const hit = await cache.match(request);
        if (hit) return hit;
      }
      return undefined;
    },
  };

  const listeners = new Map<string, ((event: unknown) => void)[]>();
  let skipWaitingCalled = false;

  const self = {
    location: { origin: ORIGIN },
    clients: { claim: async () => {} },
    skipWaiting: () => {
      skipWaitingCalled = true;
    },
    addEventListener(type: string, handler: (event: unknown) => void) {
      const existing = listeners.get(type) ?? [];
      listeners.set(type, [...existing, handler]);
    },
  };

  async function fakeFetch(request: FakeRequest) {
    fetched.push(request.url);
    if (offline) throw new TypeError("Failed to fetch");
    return new Response(`network ${request.url}`, { status: 200 });
  }

  const context: Record<string, unknown> = { self, caches, fetch: fakeFetch, Response, URL };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(SOURCE, context);

  return {
    storage,
    fetched,
    skipWaiting: () => skipWaitingCalled,

    async dispatch(type: string, event: Record<string, unknown>) {
      for (const handler of listeners.get(type) ?? []) handler(event);
    },

    /**
     * Returns what the worker chose to serve, or null when it declined to
     * handle the request at all and left it to the browser.
     */
    async handle(request: FakeRequest): Promise<Response | null> {
      let answered: Promise<Response> | null = null;
      const waits: Promise<unknown>[] = [];
      for (const handler of listeners.get("fetch") ?? []) {
        handler({
          request,
          respondWith(value: Promise<Response>) {
            answered = value;
          },
          waitUntil(value: Promise<unknown>) {
            waits.push(value);
          },
        });
      }
      const result = answered === null ? null : await answered;
      await Promise.all(waits);
      return result;
    },

    async lifecycle(type: "install" | "activate") {
      const waits: Promise<unknown>[] = [];
      for (const handler of listeners.get(type) ?? []) {
        handler({ waitUntil: (value: Promise<unknown>) => waits.push(value) });
      }
      await Promise.all(waits);
    },
  };
}

function get(path: string, mode = "cors"): FakeRequest {
  return { method: "GET", url: absolute(path), mode };
}

describe("the api", () => {
  it("is never served from a cache and never written to one", async () => {
    const worker = load();
    await worker.lifecycle("install");

    const response = await worker.handle(get("/api/trail"));

    // Declining to respond hands the request back to the browser untouched,
    // which is the only outcome that leaves nothing behind.
    expect(response).toBeNull();
    for (const cache of worker.storage.values()) {
      expect([...cache.entries.keys()].join(" ")).not.toContain("/api/");
    }
  });

  it("leaves a request that carries a session alone, wherever it goes", async () => {
    const worker = load();
    const response = await worker.handle({
      method: "GET",
      url: absolute("/anything"),
      mode: "cors",
      headers: new Headers({ authorization: "Bearer secret" }),
    });
    expect(response).toBeNull();
    expect(worker.fetched).toHaveLength(0);
  });

  it("stays out of every cache even after the page has been used offline", async () => {
    const worker = load({ offline: true });
    await worker.lifecycle("install");
    await worker.handle(get("/", "navigate"));
    await worker.handle(get("/api/trail"));

    const stored = [...worker.storage.values()].flatMap((cache) => [...cache.entries.keys()]);
    expect(stored.some((url) => url.includes("/api/"))).toBe(false);
  });
});

describe("pages", () => {
  it("come from the network when there is one, so the wording is current", async () => {
    const worker = load();
    const response = await worker.handle(get("/", "navigate"));
    expect(await response?.text()).toContain("network");
  });

  it("open the trail with the network off, straight after install", async () => {
    const worker = load({ offline: true });
    await worker.lifecycle("install");
    const response = await worker.handle(get("/trail", "navigate"));
    expect(response?.status).toBe(200);
    expect(await response?.text()).toContain("/trail");
  });

  it("come from the cache when the network has gone", async () => {
    const online = load();
    await online.handle(get("/", "navigate"));

    const offline = load({ offline: true });
    await offline.lifecycle("install");
    const response = await offline.handle(get("/", "navigate"));

    expect(response).not.toBeNull();
    expect(response?.status).toBe(200);
  });

  it("fall back to the offline page for somewhere never visited", async () => {
    const worker = load({ offline: true });
    await worker.lifecycle("install");

    const response = await worker.handle(get("/somewhere-new", "navigate"));
    expect(await response?.text()).toContain("/offline");
  });

  it("never leave the person with nothing at all", async () => {
    // No install ran, so there is no offline page stored either.
    const worker = load({ offline: true });
    const response = await worker.handle(get("/somewhere-new", "navigate"));
    expect(response?.status).toBe(503);
  });
});

describe("what the worker leaves alone", () => {
  it("ignores anything that is not a GET", async () => {
    const worker = load();
    expect(await worker.handle({ method: "POST", url: absolute("/api/trail") })).toBeNull();
    expect(await worker.handle({ method: "POST", url: absolute("/") })).toBeNull();
  });

  it("ignores other origins, including the api when it lives elsewhere", async () => {
    const worker = load();
    const response = await worker.handle({
      method: "GET",
      url: "https://api.hifz.example/trail",
      mode: "cors",
    });
    expect(response).toBeNull();
  });
});

describe("build output", () => {
  it("is served from the cache without asking the network again", async () => {
    const worker = load();
    const asset = get("/_next/static/chunks/main-abc123.js");

    await worker.handle(asset);
    expect(worker.fetched).toHaveLength(1);

    await worker.handle(asset);
    // Content-hashed, so a second request for the same URL is the same file.
    expect(worker.fetched).toHaveLength(1);
  });
});

describe("updating", () => {
  let worker: ReturnType<typeof load>;

  beforeEach(() => {
    worker = load();
  });

  it("takes over only when the page asks it to", async () => {
    await worker.dispatch("message", { data: "something-else" });
    expect(worker.skipWaiting()).toBe(false);

    await worker.dispatch("message", { data: "skip-waiting" });
    expect(worker.skipWaiting()).toBe(true);
  });

  it("clears out caches from older versions on activation", async () => {
    const stale = await (worker as unknown as { storage: Map<string, FakeCache> }).storage;
    stale.set("shell-v0", new FakeCache());
    stale.set("runtime-v0", new FakeCache());

    await worker.lifecycle("activate");

    expect([...stale.keys()]).not.toContain("shell-v0");
    expect([...stale.keys()]).not.toContain("runtime-v0");
  });
});
