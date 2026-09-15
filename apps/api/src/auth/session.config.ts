import type { SessionConfig } from "./auth.contracts.js";

function positiveInteger(value: string | undefined, fallback: number, name: string): number {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0)
    throw new Error(`${name} must be a positive integer`);
  return parsed;
}

export function loadSessionConfig(environment: NodeJS.ProcessEnv = process.env): SessionConfig {
  return {
    inactivitySeconds: positiveInteger(
      environment.SESSION_INACTIVITY_SECONDS,
      30 * 60,
      "SESSION_INACTIVITY_SECONDS",
    ),
    absoluteSeconds: positiveInteger(
      environment.SESSION_ABSOLUTE_SECONDS,
      8 * 60 * 60,
      "SESSION_ABSOLUTE_SECONDS",
    ),
    secureCookie: environment.NODE_ENV === "production",
  };
}
