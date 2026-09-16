import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    
    // ✅ Telegram bo'lsa — hech narsa qilma
    if (context.getType() as string === 'telegraf') {
      return next.handle();
    }
    return next.handle().pipe(
      map(data => ({
        success: true,
        data,
        message: 'Operation successful',
        timestamp: new Date().toISOString(),
      }))
    );
  }
}