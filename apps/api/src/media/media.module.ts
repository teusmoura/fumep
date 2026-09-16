import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { MediaController } from "./media.controller.js";
import { MediaService } from "./media.service.js";
import { MediaStore } from "./media.store.js";
import { MediaStorage } from "./media.storage.js";
import { MediaQueueProvider } from "./media-queue.provider.js";
@Module({
  imports: [AuthModule],
  controllers: [MediaController],
  providers: [MediaService, MediaStore, MediaStorage, MediaQueueProvider],
  exports: [MediaQueueProvider],
})
export class MediaModule {}
