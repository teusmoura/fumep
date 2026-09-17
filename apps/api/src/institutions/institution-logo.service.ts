import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  type OnModuleDestroy,
} from "@nestjs/common";
import { createDatabase, InstitutionLogoRepository, InvalidInstitutionLogoError } from "@fumep/db";
import { IMAGE_MAX_BYTES } from "@fumep/validation";
import { MediaStorage } from "@fumep/storage";
import type { InstitutionLogoInput } from "@fumep/db";

@Injectable()
export class InstitutionLogoService implements OnModuleDestroy {
  private connection?: ReturnType<typeof createDatabase>;
  private database() {
    if (!this.connection) {
      if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL required");
      this.connection = createDatabase(process.env.DATABASE_URL);
    }
    return this.connection.db;
  }
  async update(id: string, input: InstitutionLogoInput, userId: string) {
    try {
      const updated = await new InstitutionLogoRepository(this.database()).update(
        id,
        input,
        userId,
      );
      if (!updated) throw new NotFoundException("Institution not found");
      return { id: updated.id, logoLightId: updated.logoLightId, logoDarkId: updated.logoDarkId };
    } catch (error) {
      if (error instanceof InvalidInstitutionLogoError)
        throw new BadRequestException(error.message);
      if (error instanceof NotFoundException) throw error;
      throw new ServiceUnavailableException("Logo configuration unavailable");
    }
  }
  private async available(id: string | null) {
    if (!id) return undefined;
    const image = await new InstitutionLogoRepository(this.database()).findMedia(id);
    if (
      !image ||
      image.type !== "IMAGE" ||
      image.processingStatus !== "READY" ||
      image.deletionStatus !== "NONE" ||
      !["image/png", "image/jpeg", "image/webp", "image/avif"].includes(image.mimeType)
    )
      return undefined;
    return image;
  }
  async publicPaths(owner: {
    slug: string;
    logoLightId: string | null;
    logoDarkId: string | null;
  }) {
    const light = await this.available(owner.logoLightId);
    const dark = await this.available(owner.logoDarkId);
    return {
      ...(light ? { logoLightUrl: `/media/institutions/${owner.slug}/logo/light` } : {}),
      ...(dark ? { logoDarkUrl: `/media/institutions/${owner.slug}/logo/dark` } : {}),
    };
  }
  async readPublic(slug: string, appearance: "light" | "dark") {
    const owner = await new InstitutionLogoRepository(this.database()).findInstitution(slug);
    if (!owner?.isActive) throw new NotFoundException("Logo not found");
    const image =
      appearance === "dark"
        ? ((await this.available(owner.logoDarkId)) ?? (await this.available(owner.logoLightId)))
        : await this.available(owner.logoLightId);
    if (!image) throw new NotFoundException("Logo not found");
    // Only an active institution's selected logo is public. Never a generic media UUID gateway.
    if (!/^images\/originals\/[0-9a-f-]{36}\.(png|jpg|jpeg|webp|avif)$/i.test(image.storageKey))
      throw new ServiceUnavailableException("Logo unavailable");
    try {
      const variants = await new InstitutionLogoRepository(this.database()).findVariants(image.id);
      const thumbnail = variants.find(
        (row) => row.format === "WEBP" && row.width !== null && row.width <= 320,
      );
      const assetKey = thumbnail?.storageKey ?? image.storageKey;
      if (thumbnail && !/^images\/variants\/[0-9a-f-]{36}-[1-9][0-9]*\.webp$/i.test(assetKey))
        throw new Error("Invalid logo variant");
      const bytes = await new MediaStorage().read(assetKey, IMAGE_MAX_BYTES);
      return { bytes, mimeType: thumbnail ? "image/webp" : image.mimeType };
    } catch {
      throw new ServiceUnavailableException("Logo unavailable");
    }
  }
  async onModuleDestroy() {
    if (this.connection) await this.connection.client.end();
  }
}
