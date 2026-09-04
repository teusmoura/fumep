import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";

import { HealthService } from "./health.service.js";

@ApiTags("health")
@Controller("health")
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: "Verifica a disponibilidade da API" })
  @ApiOkResponse({
    description: "API disponível",
    schema: { example: { status: "ok" } },
  })
  getHealth() {
    return this.healthService.getHealth();
  }
}
