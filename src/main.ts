import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import compression from 'compression';
import helmet from 'helmet';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/http/http-exception.filter';
import validationOptions from './common/validator/options.validator';
import { ConfigService } from '@nestjs/config';
import { readEnvValue } from './utils/env.util';
import { requestLogger } from './common/middleware/request-logger.middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  app.use(helmet());
  app.use(compression());
  app.use(requestLogger());
  app.enableCors();
  const apiPrefix = readEnvValue(configService.get<string>('API_PREFIX')) ?? 'v1';
  app.setGlobalPrefix(apiPrefix);
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalPipes(new ValidationPipe(validationOptions));

  const appName = readEnvValue(configService.get<string>('APP_NAME')) ?? 'PIS API';
  const appDescription =
    readEnvValue(configService.get<string>('APP_DESCRIPTION')) ?? 'Inspection system API';
  const appVersion = readEnvValue(configService.get<string>('APP_VERSION')) ?? '1.0';
  const config = new DocumentBuilder()
    .setTitle(appName)
    .setDescription(appDescription)
    .setVersion(appVersion)
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(`${apiPrefix}/docs`, app, document);

  const port =
    Number(readEnvValue(configService.get<string>('APP_PORT'))) ||
    Number(readEnvValue(configService.get<string>('PORT'))) ||
    3003;
  await app.listen(port);
}
bootstrap();
