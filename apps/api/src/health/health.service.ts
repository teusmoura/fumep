import { Injectable } from "@nestjs/common";
import type { HealthResponse } from "@fumep/validation";

@Injectable()
export class HealthService {
  getHealth(): HealthResponse {
    return { status: "ok" } satisfies HealthResponse;
  }
}
