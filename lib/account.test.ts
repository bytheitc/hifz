import { describe, expect, it } from "vitest";
import {
  type AccountStatus,
  ACCOUNT_ENV,
  accountsConfigured,
  describeWhereDataLives,
} from "./account";

const url = ACCOUNT_ENV.url;

describe("accountsConfigured", () => {
  it("is false when nothing is set", () => {
    expect(accountsConfigured({})).toBe(false);
  });

  it("is false for a blank string, which is what an unset variable becomes", () => {
    expect(accountsConfigured({ [url]: "  " })).toBe(false);
  });

  it("is true once the api address is set", () => {
    expect(accountsConfigured({ [url]: "https://api.example.org" })).toBe(true);
  });
});

describe("describeWhereDataLives", () => {
  it("promises the device only while that is true", () => {
    expect(describeWhereDataLives({ kind: "not-configured" })).toBe(
      "Everything stays on this device"
    );
    expect(describeWhereDataLives({ kind: "signed-out" })).toBe(
      "Everything stays on this device"
    );
  });

  it("names the account once someone signs in", () => {
    const signedIn: AccountStatus = { kind: "signed-in", email: "a@b.org" };

    expect(describeWhereDataLives(signedIn)).toContain("a@b.org");
  });

  it("does not claim a trail is synced before it has been", () => {
    // A student who believed that would clear their browser and lose
    // everything. Signing in gets an account; it does not upload a trail.
    const signedIn: AccountStatus = { kind: "signed-in", email: "a@b.org" };

    expect(describeWhereDataLives(signedIn)).toContain("not synced yet");
    expect(describeWhereDataLives(signedIn)).not.toContain("Synced to");
  });

  it("says so once the trail really has reached the server", () => {
    const synced: AccountStatus = { kind: "synced", email: "a@b.org" };

    expect(describeWhereDataLives(synced)).toBe("Synced to a@b.org");
    expect(describeWhereDataLives(synced)).not.toContain("this device");
  });
});
