import { Module } from '@nestjs/common';
import { StatisticsService } from './statistics.service';
import { StatisticsController } from './statistics.controller';
import { StatisticsGateway } from './statistics.geteway';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Statistics } from './entities/statistic.entity';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Statistics]), AuthModule],
  controllers: [StatisticsController],
  providers: [StatisticsService, StatisticsGateway],
  exports: [StatisticsService],
})
export class StatisticsModule {}
