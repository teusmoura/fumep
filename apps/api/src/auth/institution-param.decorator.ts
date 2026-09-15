import { SetMetadata } from "@nestjs/common";

export const INSTITUTION_PARAM_KEY = "auth:institution-param";

export const InstitutionParam = (parameterName = "institutionId") =>
  SetMetadata(INSTITUTION_PARAM_KEY, parameterName);
