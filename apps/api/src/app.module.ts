import { Module } from "@nestjs/common";

import { AuthModule } from "./auth/auth.module.js";
import { InstitutionModule } from "./institutions/institution.module.js";
import { HealthController } from "./health/health.controller.js";
import { HealthService } from "./health/health.service.js";

@Module({
  imports: [AuthModule, InstitutionModule],
  controllers: [HealthController],
  providers: [HealthService],
})
export class AppModule {}
