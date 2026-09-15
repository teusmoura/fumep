import type { ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { describe, expect, it } from "vitest";

import type { SessionData } from "./auth.contracts.js";
import { InstitutionGuard } from "./institution.guard.js";

function contextFor(auth: SessionData, params: Record<string, string>): ExecutionContext {
  return {
    getHandler: () => contextFor,
    getClass: () => InstitutionGuard,
    switchToHttp: () => ({
      getRequest: () => ({ auth, params }),
    }),
  } as unknown as ExecutionContext;
}

function session(role: SessionData["role"], institutionIds: string[]): SessionData {
  const now = new Date().toISOString();
  return {
    userId: crypto.randomUUID(),
    role,
    institutionIds,
    createdAt: now,
    lastActivityAt: now,
    absoluteExpiresAt: new Date(Date.now() + 60_000).toISOString(),
  };
}

describe("InstitutionGuard", () => {
  const reflector = {
    getAllAndOverride: () => ["institutionId"],
  } as unknown as Reflector;
  const guard = new InstitutionGuard(reflector);
  const assignedInstitution = crypto.randomUUID();
  const otherInstitution = crypto.randomUUID();

  it("allows an editor only inside the assigned institutional scope", () => {
    const editor = session("EDITOR", [assignedInstitution]);

    expect(guard.canActivate(contextFor(editor, { institutionId: assignedInstitution }))).toBe(
      true,
    );
    expect(guard.canActivate(contextFor(editor, { institutionId: otherInstitution }))).toBe(false);
  });

  it("allows an administrator globally", () => {
    expect(
      guard.canActivate(contextFor(session("ADMIN", []), { institutionId: otherInstitution })),
    ).toBe(true);
  });

  it("requires an editor to hold every institution in a multi-institution scope", () => {
    const secondAssignedInstitution = crypto.randomUUID();
    const multiInstitutionReflector = {
      getAllAndOverride: () => ["primaryInstitutionId", "secondaryInstitutionId"],
    } as unknown as Reflector;
    const multiInstitutionGuard = new InstitutionGuard(multiInstitutionReflector);
    const params = {
      primaryInstitutionId: assignedInstitution,
      secondaryInstitutionId: secondAssignedInstitution,
    };

    expect(
      multiInstitutionGuard.canActivate(
        contextFor(session("EDITOR", [assignedInstitution, secondAssignedInstitution]), params),
      ),
    ).toBe(true);
    expect(
      multiInstitutionGuard.canActivate(
        contextFor(session("EDITOR", [assignedInstitution]), params),
      ),
    ).toBe(false);
  });
});
