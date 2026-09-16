"use client";
import { createContext, useContext, type ReactNode } from "react";
import type { PublicInstitution } from "./institution-route";

const InstitutionContext = createContext<PublicInstitution | undefined>(undefined);

export function InstitutionProvider({
  institution,
  children,
}: {
  institution: PublicInstitution;
  children: ReactNode;
}) {
  return <InstitutionContext.Provider value={institution}>{children}</InstitutionContext.Provider>;
}

export function useInstitution() {
  const institution = useContext(InstitutionContext);
  if (!institution) throw new Error("useInstitution requires InstitutionProvider");
  return institution;
}
