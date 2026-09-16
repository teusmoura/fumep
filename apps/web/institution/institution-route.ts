export const publicInstitutions = {
  fumep: { slug: "fumep", name: "FUMEP", homePath: "/" },
  etmsl: { slug: "etmsl", name: "ETMSL", homePath: "/etmsl" },
  cramam: { slug: "cramam", name: "CRAMAM", homePath: "/cramam" },
} as const;

export type InstitutionSlug = keyof typeof publicInstitutions;
export type PublicInstitution = (typeof publicInstitutions)[InstitutionSlug];

// Match complete URL segments, not prefixes such as /etmsl-other.
export function resolveInstitution(pathname: string): PublicInstitution {
  const segment = pathname.split("/")[1];
  if (segment === "etmsl" || segment === "cramam") return publicInstitutions[segment];
  return publicInstitutions.fumep;
}
