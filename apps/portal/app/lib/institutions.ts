export const institutions = {
  fumep: {
    slug: "fumep",
    name: "FUMEP",
    homePath: "/",
    brand: "#143d70",
  },
  etmsl: {
    slug: "etmsl",
    name: "ETMSL",
    homePath: "/etmsl",
    brand: "#165c51",
  },
  cramam: {
    slug: "cramam",
    name: "CRAMAM",
    homePath: "/cramam",
    brand: "#713946",
  },
} as const;

export type InstitutionSlug = keyof typeof institutions;
export type Institution = (typeof institutions)[InstitutionSlug];

export function getInstitution(slug: string): Institution | undefined {
  if (Object.hasOwn(institutions, slug)) {
    return institutions[slug as InstitutionSlug];
  }
  return undefined;
}
