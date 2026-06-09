import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as express from 'express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });

  app.use(express.json({ limit: "25mb" }));
  app.use(express.urlencoded({ limit: "25mb", extended: true }));

  // PNGs unter /img/... verfügbar machen
  app.use('/img', express.static(join(__dirname, '..', 'public', 'cards'), {
    maxAge: '30d',
    etag: true,
    immutable: true,
  }));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
}
bootstrap();
