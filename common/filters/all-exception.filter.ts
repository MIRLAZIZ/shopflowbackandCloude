import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ErrorLogger');

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // 🧠 Xabarni aniqlash (turiga qarab)
    let message: any;

    if (exception instanceof HttpException) {
      const res = exception.getResponse();
      // Agar HttpException message array yoki object bo‘lsa — to‘g‘rilab chiqamiz
      message =
        typeof res === 'string'
          ? res
          : (res as any).message || (res as any).error || JSON.stringify(res);
    } else {
      // Oddiy Error (masalan, TypeError, QueryFailedError)
      message = exception.message || exception.toString();
    }

    // 🔥 To‘liq exceptionni konsolda ko‘rsatamiz
    console.error('🔥 FULL ERROR:', exception);

    // ⚙️ Loggerga yozamiz
    this.logger.error({
      status,
      message,
      path: request.url,
      method: request.method,
      timestamp: new Date().toISOString(),
    });

    // 🚀 Foydalanuvchiga real xabarni yuboramiz
    response.status(status).json({
      success: false,
      statusCode: status,
      message,
      error:
        process.env.NODE_ENV === 'development'
          ? exception.stack
          : undefined, // stack faqat devda chiqadi
    });
  }
}
