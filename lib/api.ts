import axios, { type AxiosInstance } from "axios";
import { apiUrl } from "./account";
import type { TrailTransport } from "./sync";

/**
 * The client for our own api.
 *
 * Only reached when `NEXT_PUBLIC_API_URL` is set. Everything the app does
 * works without it, so nothing here may be on a path that a device-only user
 * walks: no module-level request, no provider that throws when unconfigured.
 */

const TOKEN_KEY = "hifz-trail:token";
const EMAIL_KEY = "hifz-trail:email";
const SUBJECT_KEY = "hifz-trail:account-subject";

export interface PublicUser {
  id: string;
  email: string;
  name: string | null;
  subjectId: string;
}

export function readToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function writeToken(token: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (token === null) window.localStorage.removeItem(TOKEN_KEY);
    else window.localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // Private mode. The session lasts as long as the tab, which is worse
    // than it could be but better than a crash on sign-in.
  }
}

export function client(): AxiosInstance {
  const base = apiUrl();
  if (!base) throw new Error("No api is configured.");

  const instance = axios.create({ baseURL: base, timeout: 20_000 });

  instance.interceptors.request.use((config) => {
    const token = readToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });

  return instance;
}

/**
 * Turn an axios failure into the sentence the api sent.
 *
 * The api answers refusals with `{ error }`, and that text is written for the
 * person rather than the developer. Showing "Request failed with status code
 * 401" instead would be throwing away the better message.
 */
export function describeFailure(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const said = error.response?.data?.error;
    if (typeof said === "string" && said.trim() !== "") return said;
    if (error.code === "ECONNABORTED") return "That took too long. Try again.";
    if (!error.response) return "Could not reach the server. Check your connection.";
  }
  return "Something went wrong. Try again.";
}

export async function register(input: {
  email: string;
  password: string;
  name?: string;
}): Promise<{ token: string; user: PublicUser }> {
  const { data } = await client().post("/auth/register", input);
  return data;
}

export async function login(input: {
  email: string;
  password: string;
}): Promise<{ token: string; user: PublicUser }> {
  const { data } = await client().post("/auth/login", input);
  return data;
}

export async function me(): Promise<PublicUser> {
  const { data } = await client().get("/auth/me");
  return data.user;
}

/** The signed-in address, kept only so the header can name it without a
 *  request on every page load. The token is the authority; this is a label. */
export function readAccountEmail(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(EMAIL_KEY);
  } catch {
    return null;
  }
}

export function readAccountSubject(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(SUBJECT_KEY);
  } catch {
    return null;
  }
}

export function rememberAccount(user: PublicUser): void {
  try {
    window.localStorage.setItem(EMAIL_KEY, user.email);
    // Needed by sync: it is what ties this device's trail to the account,
    // and what the provenance guard checks the server's answer against.
    window.localStorage.setItem(SUBJECT_KEY, user.subjectId);
  } catch {
    // Not worth failing a sign-in over.
  }
}

/** Ends the session on this device. The trail itself is left exactly where
 *  it is: signing out is not a request to delete years of someone's hifz. */
export function signOut(): void {
  writeToken(null);
  try {
    window.localStorage.removeItem(EMAIL_KEY);
    window.localStorage.removeItem(SUBJECT_KEY);
  } catch {
    // Nothing to do; the token is already gone, which is what matters.
  }
}


/**
 * The sync transport, over http.
 *
 * Thin on purpose: every rule about what merges with what lives in
 * `lib/sync.ts` and is tested without a network. This only moves bytes.
 */
export function trailTransport(): TrailTransport {
  const http = client();

  return {
    async fetch() {
      const { data } = await http.get("/trails/me");
      return {
        subjectId: data.subjectId,
        portions: data.portions ?? [],
        // The api does not store whose trail an event is on - it is implied
        // by the account - so the field is filled in here and rewritten
        // again when the event is taken into a local trail.
        events: (data.events ?? []).map((event: Record<string, unknown>) => ({
          ...event,
          studentId: "",
        })),
      };
    },

    async sendPortions(portions) {
      const { data } = await http.post("/trails/me/portions", { portions });
      return { added: data.added ?? 0 };
    },

    async sendEvents(events) {
      const { data } = await http.post("/trails/me/events", { events });
      return { added: data.added ?? 0, alreadyHad: data.alreadyHad ?? 0 };
    },
  };
}
