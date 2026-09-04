import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

import { AppModule } from "./app.module.js";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix("api/v1");

  const openApiConfig = new DocumentBuilder()
    .setTitle("Portal FUMEP API")
    .setDescription("API REST do Portal FUMEP")
    .setVersion("1.0")
    .build();
  const openApiDocument = SwaggerModule.createDocument(app, openApiConfig);

  SwaggerModule.setup("api/docs", app, openApiDocument);

  await app.listen(process.env.PORT ?? 3001);
}

void bootstrap();
