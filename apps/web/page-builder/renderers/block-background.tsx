import type { CSSProperties, ReactNode } from "react";
import Image from "next/image";
import {
  contentBlockBackgroundSchema,
  heroResolvedImageSchemaV1,
  publicInstitutionThemeSchema,
  type ContentBlockCommon,
} from "@fumep/validation";
// SSR only; fresh authorized descriptors/theme come from the owner caller, never JSONB.
export function BlockBackground({
  block,
  backgroundImage,
  theme,
  children,
}: {
  block: ContentBlockCommon;
  backgroundImage?: unknown;
  theme?: unknown;
  children: ReactNode;
}) {
  const mode = contentBlockBackgroundSchema.safeParse(block.background);
  if (!mode.success) return null;
  const resolved = heroResolvedImageSchemaV1.safeParse(backgroundImage);
  if (mode.data === "IMAGE" && (!resolved.success || resolved.data.id !== block.backgroundMediaId))
    return null;
  const institution = publicInstitutionThemeSchema.safeParse(theme);
  if (mode.data === "INSTITUTION" && !institution.success) return null;
  const style =
    mode.data === "INSTITUTION" && institution.success
      ? ({
          "--color-background": institution.data.primary,
          "--color-text": institution.data.primaryForeground,
        } as CSSProperties)
      : undefined;
  return (
    <div className="block-background" data-background={mode.data} style={style}>
      {mode.data === "IMAGE" && resolved.success && (
        <Image
          className="block-background-image"
          src={resolved.data.src}
          width={resolved.data.width}
          height={resolved.data.height}
          alt=""
          unoptimized
        />
      )}
      <div className="block-background-content">{children}</div>
    </div>
  );
}
