import { asc, eq, inArray, sql } from "drizzle-orm";
import type { Database } from "./client.js";
import { MediaUsageRepository, type MediaReference } from "./media-usage.repository.js";
import { auditLogs, institutions, media, mediaVariants } from "./schema.js";

export type InstitutionLogoInput = {
  logoLightId?: string | null;
  logoDarkId?: string | null;
};

export class InvalidInstitutionLogoError extends Error {
  constructor() {
    super("Institution logos must reference available ready images");
  }
}

// Internal consumer: authorization belongs to the API, never to a browser-supplied owner tuple.
export class InstitutionLogoRepository {
  constructor(private readonly database: Pick<Database, "transaction" | "query">) {}

  findInstitution(slug: string) {
    return this.database.query.institutions.findFirst({ where: eq(institutions.slug, slug) });
  }

  findMedia(id: string) {
    return this.database.query.media.findFirst({ where: eq(media.id, id) });
  }
  findVariants(id: string) {
    return this.database.query.mediaVariants.findMany({
      where: eq(mediaVariants.mediaId, id),
      orderBy: [asc(mediaVariants.width)],
    });
  }

  update(id: string, input: InstitutionLogoInput, userId: string) {
    return this.database.transaction(async (tx) => {
      const [owner] = await tx
        .select()
        .from(institutions)
        .where(eq(institutions.id, id))
        .for("update");
      if (!owner) return undefined;
      const logoLightId = input.logoLightId === undefined ? owner.logoLightId : input.logoLightId;
      const logoDarkId = input.logoDarkId === undefined ? owner.logoDarkId : input.logoDarkId;
      const references: MediaReference[] = [];
      if (logoLightId) references.push({ mediaId: logoLightId, fieldName: "logo_light_id" });
      if (logoDarkId) references.push({ mediaId: logoDarkId, fieldName: "logo_dark_id" });
      // Synchronization obtains ordered media locks and refuses deletion intents. All work
      // is inside this outer transaction, so a later type/state error rolls usages back too.
      try {
        await new MediaUsageRepository(tx).synchronize("INSTITUTION", id, references);
      } catch (error) {
        if (
          error instanceof Error &&
          (error.message === "Referenced media does not exist" ||
            error.message === "Referenced media is unavailable for use")
        )
          throw new InvalidInstitutionLogoError();
        throw error;
      }
      const ids = [...new Set(references.map((row) => row.mediaId.toLowerCase()))];
      if (ids.length) {
        const images = await tx.select().from(media).where(inArray(media.id, ids));
        if (
          images.some(
            (image) =>
              image.type !== "IMAGE" ||
              image.processingStatus !== "READY" ||
              image.deletionStatus !== "NONE" ||
              !["image/png", "image/jpeg", "image/webp", "image/avif"].includes(image.mimeType),
          )
        )
          throw new InvalidInstitutionLogoError();
      }
      const [updated] = await tx
        .update(institutions)
        .set({ logoLightId, logoDarkId, updatedAt: sql`now()` })
        .where(eq(institutions.id, id))
        .returning();
      if (
        owner.logoLightId !== (logoLightId?.toLowerCase() ?? null) ||
        owner.logoDarkId !== (logoDarkId?.toLowerCase() ?? null)
      )
        await tx.insert(auditLogs).values({
          userId,
          action: "INSTITUTION_LOGOS_UPDATED",
          entityType: "INSTITUTION",
          entityId: id,
          metadata: { logoLightId, logoDarkId },
        });
      return updated;
    });
  }
}
