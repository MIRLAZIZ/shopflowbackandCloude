import { Global, Module } from '@nestjs/common';
import { SubscriptionCacheService } from './subscription-cache.service';

@Global()
@Module({
  providers: [SubscriptionCacheService],
  exports: [SubscriptionCacheService],
})
export class SubscriptionModule {}
