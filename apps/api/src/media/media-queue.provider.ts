import { Injectable, type OnModuleDestroy } from "@nestjs/common";
import { MediaQueue } from "@fumep/jobs";

@Injectable()
export class MediaQueueProvider implements OnModuleDestroy {
  readonly producer = new MediaQueue();
  async onModuleDestroy() {
    await this.producer.close();
  }
}
