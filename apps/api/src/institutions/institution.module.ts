import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { InstitutionController } from "./institution.controller.js";
import { INSTITUTION_REPOSITORY, InstitutionService } from "./institution.service.js";
import { LazyInstitutionRepository } from "./lazy-institution.repository.js";
import { PublicThemeController, PublicThemeService } from "./public-theme.controller.js";
import {
  InstitutionSettingService,
  INSTITUTION_SETTING_REPOSITORY,
  LazyInstitutionSettingRepository,
} from "./institution-setting.service.js";
@Module({
  imports: [AuthModule],
  controllers: [InstitutionController, PublicThemeController],
  providers: [
    PublicThemeService,
    InstitutionSettingService,
    { provide: INSTITUTION_SETTING_REPOSITORY, useClass: LazyInstitutionSettingRepository },
    InstitutionService,
    { provide: INSTITUTION_REPOSITORY, useClass: LazyInstitutionRepository },
  ],
})
export class InstitutionModule {}
