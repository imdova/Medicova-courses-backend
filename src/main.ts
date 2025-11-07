import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
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
  if (
    !user ||
    user.name !== SWAGGER_USERNAME ||
    user.pass !== SWAGGER_PASSWORD
  ) {
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

    // ✅ Enable cookie parser FIRST
    app.use(cookieParser());

    app.setGlobalPrefix('api');

    // ✅ Improved CORS configuration
    app.enableCors({
      origin: function (origin, callback) {

        // Allow requests with no origin (mobile apps, postman, etc.)
        if (!origin) return callback(null, true);

        const allowedOrigins = [
          'http://localhost:3000',
          'http://localhost:3001',
          'http://localhost:5173',
          'http://127.0.0.1:3000',
          'http://127.0.0.1:3001',
          'http://127.0.0.1:5173',
          'https://courses.medicova.net',
          'https://medicova-courses-git-test-cors-auth-imdovas-projects.vercel.app',
          'https://medicova-courses-git-preview-imdovas-projects.vercel.app',
          'null' // for file:// protocol
        ];

        if (allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(null, false);
        }
      },
      methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
      credentials: true, // ✅ This is crucial for cookies
      preflightContinue: false,
      optionsSuccessStatus: 204
    });

    // ✅ Add ClassSerializerInterceptor globally
    app.useGlobalInterceptors(
      new ClassSerializerInterceptor(app.get(Reflector)),
    );

    // ✅ Global validation pipes
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    app.enableShutdownHooks(); // <-- ensures DB pool closes on exit

    // Swagger static assets (optional for local dev)
    try {
      app.useStaticAssets(
        join(__dirname, '..', 'node_modules', 'swagger-ui-dist'),
        {
          prefix: '/swagger-ui/',
        },
      );
    } catch {
      console.log('Static assets path not found, continuing...');
    }

    // Swagger docs setup
    const config = new DocumentBuilder()
      .setTitle('Medicova API')
      .setDescription('API documentation for Medicova app')
      .setVersion('1.0')
      .addBearerAuth(
        {
          // Defines the security scheme type
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter JWT Bearer token',
          in: 'header',
        },
        'access_token', // 👈 Name the scheme (used later in @ApiBearerAuth)
      )
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