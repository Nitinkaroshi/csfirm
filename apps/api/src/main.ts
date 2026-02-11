import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';
import { ResponseTransformInterceptor } from './common/interceptors/response-transform.interceptor';
import { PerformanceInterceptor } from './common/interceptors/performance.interceptor';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: false }),
  );

  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port', 3000);
  const nodeEnv = configService.get<string>('app.nodeEnv', 'development');
  const frontendUrl = configService.get<string>('app.frontendUrl', 'http://localhost:3001');
  const apiPrefix = configService.get<string>('app.apiPrefix', 'api');

  // Global prefix
  app.setGlobalPrefix(apiPrefix);

  // CORS
  await app.register(require('@fastify/cors'), {
    origin: frontendUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Vault-Token',
      'X-Request-ID',
    ],
  });

  // Cookie support (required for HTTP-only auth cookies)
  await app.register(require('@fastify/cookie'), {
    secret: configService.get<string>('jwt.secret'),
  });

  // Helmet (security headers)
  await app.register(require('@fastify/helmet'), {
    contentSecurityPolicy: nodeEnv === 'production' ? undefined : false,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: false,
      },
    }),
  );

  // Global filters
  app.useGlobalFilters(new HttpExceptionFilter(), new PrismaExceptionFilter());

  // Global interceptors
  app.useGlobalInterceptors(
    new ResponseTransformInterceptor(),
    new PerformanceInterceptor(),
  );

  // Swagger (development only)
  if (nodeEnv !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('CSFIRM API')
      .setDescription('Company Secretary Firm Management Platform API')
      .setVersion('1.0')
      .addBearerAuth()
      .addApiKey({ type: 'apiKey', name: 'X-Vault-Token', in: 'header' }, 'vault-token')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup(`${apiPrefix}/docs`, app, document);
  }

  await app.listen(port, '0.0.0.0');

  const logger = new Logger('Bootstrap');
  logger.log(`CSFIRM API running on http://localhost:${port}/${apiPrefix}`);
  logger.log(`Environment: ${nodeEnv}`);
  if (nodeEnv !== 'production') {
    logger.log(`Swagger: http://localhost:${port}/${apiPrefix}/docs`);
  }
}

bootstrap();
