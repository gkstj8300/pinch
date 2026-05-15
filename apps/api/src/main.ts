import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // CORS — Expo Go(web/iPhone), 사업주 web, Mobile dev client 등 모든
  // 클라이언트가 다른 origin 에서 호출. dev 단계는 모든 origin 허용.
  // production 단계에서는 origin 화이트리스트(도메인 명시) 권장.
  app.enableCors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const port = Number(process.env.PORT) || 3000;
  await app.listen(port);
  Logger.log(`PINCH API listening on :${port}`, 'Bootstrap');
}

bootstrap();
