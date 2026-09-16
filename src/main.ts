import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { CustomExceptionFilter } from 'common/custom-exception.filter';
import { ResponseInterceptor } from 'common/response.interceptor';
import { WinstonModule } from 'nest-winston';
import { winstonErrorConfig } from './logger/logger.config';
import { AllExceptionsFilter } from 'common/filters/all-exception.filter';
import helmet from 'helmet';
async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: WinstonModule.createLogger(winstonErrorConfig),
    cors: true        
  });

  app.use(helmet());

  app.useGlobalFilters(
    new AllExceptionsFilter());
    // new CustomExceptionFilter(),
  app.useGlobalInterceptors(new ResponseInterceptor());

  // Project root dagi uploads papkasi uchun
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });
  app.setGlobalPrefix('api');
  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true, // Faqat DTO dagi maydonlar qabul qilinsin
    forbidNonWhitelisted: true, // Qo‘shimcha maydon bo‘lsa xato qaytarsin
    transform: true, // Avtomatik DTO ga o‘girish uchun
    
  }));
  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  
    console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
