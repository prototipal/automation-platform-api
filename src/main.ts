import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import {
  DatabaseConnectionException,
  DatabaseExceptionFilter,
  AllExceptionsFilter,
} from './common';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  try {
    const app = await NestFactory.create(AppModule);
    const configService = app.get(ConfigService);

    // Global configuration
    const globalPrefix = configService.get<string>('app.globalPrefix', 'api');
    const port = configService.get<number>('app.port', 3007);
    const environment = configService.get<string>('app.environment', 'development');

    // Global exception filters
    app.useGlobalFilters(
      new AllExceptionsFilter(),
      new DatabaseExceptionFilter(),
    );

    // Global pipes
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    // Set global prefix
    app.setGlobalPrefix(globalPrefix);

    // Configure Swagger documentation for development mode only
    if (environment === 'development') {
      const config = new DocumentBuilder()
        .setTitle('Automation Platform API')
        .setDescription(
          'A comprehensive REST API for managing AI automation services and workflows. ' +
          'This platform provides endpoints for configuring various AI models, managing service providers, ' +
          'and handling automated workflows for image-to-video generation and text-to-image services.'
        )
        .setVersion('1.0.0')
        .addTag('Services', 'AI service configuration and management endpoints')
        .addTag('Health', 'Application health monitoring endpoints')
        .addBearerAuth({
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'API Key',
          name: 'API Key',
          description: 'Enter your API key',
          in: 'header',
        }, 'ApiKey')
        .addBearerAuth({
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'Supabase Token',
          description: 'Enter your Supabase JWT token',
          in: 'header',
        }, 'SupabaseToken')
        .addApiKey({
          type: 'apiKey',
          name: 'X-API-Key',
          in: 'header',
          description: 'API key sent via X-API-Key header',
        }, 'ApiKeyHeader')
        .addApiKey({
          type: 'apiKey',
          name: 'X-Supabase-Token',
          in: 'header',
          description: 'Supabase token sent via X-Supabase-Token header',
        }, 'SupabaseTokenHeader')
        .setContact(
          'API Support',
          'https://github.com/your-repo/automation-platform-api',
          'support@example.com'
        )
        .setLicense('MIT', 'https://opensource.org/licenses/MIT')
        .addServer(`http://localhost:${port}`, 'Development Server')
        .addServer('http://195.201.93.232:3000', 'Production Server')
        .build();

      const document = SwaggerModule.createDocument(app, config, {
        operationIdFactory: (controllerKey: string, methodKey: string) =>
          `${controllerKey}_${methodKey}`,
      });

      SwaggerModule.setup(`${globalPrefix}/docs`, app, document, {
        customSiteTitle: 'Automation Platform API Documentation',
        customfavIcon: '/favicon.ico',
        customCss: `
          .swagger-ui .topbar { display: none }
          .swagger-ui .info .title { color: #3b82f6; }
          .swagger-ui .info .description { font-size: 14px; }
        `,
        swaggerOptions: {
          persistAuthorization: true,
          displayRequestDuration: true,
          filter: true,
          showExtensions: true,
          showCommonExtensions: true,
          tryItOutEnabled: true,
        },
      });

      logger.log(
        `Swagger documentation available at: http://localhost:${port}/${globalPrefix}/docs`
      );
    }

    // Enable CORS
    app.enableCors();

    await app.listen(port);

    logger.log(
      `Application is running on: http://localhost:${port}/${globalPrefix}`,
    );
    logger.log(
      `Health check available at: http://localhost:${port}/${globalPrefix}/health`,
    );
  } catch (error) {
    logger.error('Failed to start application', error);

    if (
      error.message?.includes('database') ||
      error.message?.includes('connection')
    ) {
      throw new DatabaseConnectionException(
        'Failed to connect to PostgreSQL database',
      );
    }

    throw error;
  }
}

bootstrap().catch((error) => {
  const logger = new Logger('Bootstrap');
  logger.error('Application failed to start', error);
  process.exit(1);
});
