import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import basicAuth from 'basic-auth';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import cookieParser from 'cookie-parser';

// --- Swagger Auth ---
const SWAGGER_USERNAME = process.env.SWAGGER_USERNAME;
const SWAGGER_PASSWORD = process.env.SWAGGER_PASSWORD;

function swaggerBasicAuth(req, res, next) {
  const user = basicAuth(req);
  if (!user || user.name !== SWAGGER_USERNAME || user.pass !== SWAGGER_PASSWORD) {
    res.set('WWW-Authenticate', 'Basic realm="Swagger API Docs"');
    return res.status(401).send('Authentication required.');
  }
  next();
}

// --- Cached app instance (for serverless reuse) ---
let app: NestExpressApplication;

async function bootstrap(): Promise<NestExpressApplication> {
  if (!app) {
    app = await NestFactory.create<NestExpressApplication>(AppModule);

    // middlewares
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    app.setGlobalPrefix('api');
    app.enableCors();
    app.enableShutdownHooks(); // <-- ensures DB pool closes on exit

    // Swagger static assets (optional for local dev)
    try {
      app.useStaticAssets(join(__dirname, '..', 'node_modules', 'swagger-ui-dist'), {
        prefix: '/swagger-ui/',
      });
    } catch {
      console.log('Static assets path not found, continuing...');
    }

    // Swagger docs setup
    const config = new DocumentBuilder()
      .setTitle('Medicova API')
      .setDescription('API documentation for Medicova app')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);

    const swaggerPath = process.env.NODE_ENV === 'production' ? 'swagger' : '';

    if (process.env.NODE_ENV === 'production' && swaggerPath) {
      app.use(`/${swaggerPath}`, swaggerBasicAuth);
    }

    SwaggerModule.setup(swaggerPath, app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
      customCssUrl:
        process.env.NODE_ENV === 'production'
          ? 'https://cdn.jsdelivr.net/npm/swagger-ui-dist@4.15.5/swagger-ui.css'
          : undefined,
      customJs:
        process.env.NODE_ENV === 'production'
          ? 'https://cdn.jsdelivr.net/npm/swagger-ui-dist@4.15.5/swagger-ui-bundle.js'
          : undefined,
    });

    await app.init(); // ✅ init only once
  }

  return app;
}

// --- Vercel entrypoint ---
export default async function handler(req: any, res: any) {
  const app = await bootstrap();
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp(req, res);
}

// --- Local dev mode ---
if (process.env.NODE_ENV !== 'production') {
  bootstrap()
    .then((localApp) => {
      localApp.listen(3000).then(() => {
        console.log(
          `🚀 Medicova API running at http://localhost:3000/ (Swagger: http://localhost:3000/)`,
        );
      });
    })
    .catch((err) => {
      console.error('Error starting NestJS app locally:', err);
    });
}
