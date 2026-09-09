import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { join } from "path";
import { existsSync, mkdirSync } from "fs";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    cors: {
      origin: process.env.WEB_ORIGIN?.split(",") ?? ["http://localhost:3000"],
      credentials: true,
    },
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.setGlobalPrefix("api");

  // Resolved relative to the compiled dist/main.js, not process.cwd() — the
  // monorepo build can launch this from the repo root (Render) or apps/api
  // (local), and cwd differs between the two.
  const storageDir = join(__dirname, "..", "storage");
  if (!existsSync(storageDir)) mkdirSync(storageDir, { recursive: true });
  app.useStaticAssets(storageDir, { prefix: "/media" });

  const port = process.env.PORT ? Number(process.env.PORT) : 4000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`[api] listening on http://localhost:${port}/api`);
}

bootstrap();
