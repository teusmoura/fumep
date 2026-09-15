import { SetMetadata } from "@nestjs/common";

export const INSTITUTION_PARAM_KEY = "auth:institution-param";

export const InstitutionParams = (...parameterNames: string[]) =>
  SetMetadata(INSTITUTION_PARAM_KEY, parameterNames);

export const InstitutionParam = (parameterName = "institutionId") =>
  InstitutionParams(parameterName);
