import { Injectable } from "@nestjs/common";

export type HealthResponse = {
  status: "ok";
};

@Injectable()
export class HealthService {
  getHealth(): HealthResponse {
    return { status: "ok" };
  }
}
