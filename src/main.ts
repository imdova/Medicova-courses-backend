import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import basicAuth from 'basic-auth';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import cookieParser from 'cookie-parser';

let app: NestExpressApplication; // Change to NestExpressApplication for static serving

// Define your username and password for Swagger access
const SWAGGER_USERNAME = process.env.SWAGGER_USERNAME;
const SWAGGER_PASSWORD = process.env.SWAGGER_PASSWORD;

// Middleware to protect Swagger UI
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

async function bootstrap() {
  if (!app) {
    app = await NestFactory.create<NestExpressApplication>(AppModule);

    // Global pipes
    app.use(cookieParser()); // ✅ add this
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    app.setGlobalPrefix('api');
    app.enableCors();

    // Serve static files for Swagger UI
    try {
      app.useStaticAssets(
        join(__dirname, '..', 'node_modules', 'swagger-ui-dist'),
        {
          prefix: '/swagger-ui/',
        },
      );
    } catch (error) {
      console.log('Static assets path not found, continuing...');
    }

    // Swagger setup
    const config = new DocumentBuilder()
      .setTitle('Medicova API')
      .setDescription('API documentation for Medicova app')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);

    // Show Swagger at `/` in dev, `/swagger` in prod
    const swaggerPath = process.env.NODE_ENV === 'production' ? 'swagger' : '';

    // Apply basic auth only in production
    if (process.env.NODE_ENV === 'production' && swaggerPath) {
      app.use(`/${swaggerPath}`, swaggerBasicAuth);
    }

    // Setup Swagger with custom options
    SwaggerModule.setup(swaggerPath, app, document, {
      customCssUrl:
        process.env.NODE_ENV === 'production'
          ? 'https://cdn.jsdelivr.net/npm/swagger-ui-dist@4.15.5/swagger-ui.css'
          : undefined,
      customJs:
        process.env.NODE_ENV === 'production'
          ? 'https://cdn.jsdelivr.net/npm/swagger-ui-dist@4.15.5/swagger-ui-bundle.js'
          : undefined,
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
  }

  await app.init();
  return app;
}

// FOR VERCEL DEPLOYMENT
export default async function (req: any, res: any) {
  await bootstrap();
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp(req, res);
}

// FOR LOCAL DEVELOPMENT ONLY
if (process.env.NODE_ENV !== 'production') {
  bootstrap()
    .then((localApp) => {
      if (localApp) {
        localApp.listen(3000).then(() => {
          console.log(
            `NestJS app running locally on port 3000 - Swagger at http://localhost:3000/`,
          );
        });
      }
    })
    .catch((err) => {
      console.error('Error starting NestJS app locally:', err);
    });
}
