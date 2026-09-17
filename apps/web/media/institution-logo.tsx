import Image from "next/image";
import Link from "next/link";
import type { PublicInstitutionTheme } from "@fumep/validation";

export function InstitutionLogo({
  theme,
  name,
  homePath,
}: {
  theme: PublicInstitutionTheme;
  name: string;
  homePath: string;
}) {
  const light = theme.logoLightUrl ?? theme.logoDarkUrl;
  const dark = theme.logoDarkUrl ?? light;
  if (!light && !dark) return null;
  return (
    <Link href={homePath} className="institution-logo" aria-label={`Página inicial — ${name}`}>
      {light && (
        <Image
          src={light}
          alt={name}
          fill
          sizes="320px"
          unoptimized
          className="institution-logo-light"
        />
      )}
      {dark && (
        <Image
          src={dark}
          alt={name}
          fill
          sizes="320px"
          unoptimized
          className="institution-logo-dark"
        />
      )}
    </Link>
  );
}
