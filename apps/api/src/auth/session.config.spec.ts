import { describe, expect, it } from "vitest";

import { loadSessionConfig } from "./session.config.js";

describe("loadSessionConfig", () => {
  it("uses the canonical defaults in development", () => {
    expect(loadSessionConfig({ NODE_ENV: "development" })).toEqual({
      inactivitySeconds: 1800,
      absoluteSeconds: 28_800,
      secureCookie: false,
    });
  });

  it("supports configured durations and secure production cookies", () => {
    expect(
      loadSessionConfig({
        NODE_ENV: "production",
        SESSION_INACTIVITY_SECONDS: "900",
        SESSION_ABSOLUTE_SECONDS: "14400",
      }),
    ).toEqual({ inactivitySeconds: 900, absoluteSeconds: 14_400, secureCookie: true });
  });

  it("rejects invalid durations", () => {
    expect(() => loadSessionConfig({ SESSION_INACTIVITY_SECONDS: "0" })).toThrow();
    expect(() => loadSessionConfig({ SESSION_ABSOLUTE_SECONDS: "invalid" })).toThrow();
  });
});
