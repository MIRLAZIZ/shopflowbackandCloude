import { Controller, Get, Post, Body, Patch, Param, Delete, Req } from '@nestjs/common';
import { StatisticsService } from './statistics.service';
import { CreateStatisticDto } from './dto/create-statistic.dto';
import { UpdateStatisticDto } from './dto/update-statistic.dto';

@Controller('statistics')
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

 
@Get('/weekly')

 findWeeklyStats(@Req() req: any ) {
    const userId = req.user.id
    return this.statisticsService.weeklyStats(userId);
  }



  @Get( '/monthly')
  findMonthlyStats(@Req() req: any ) {
    const userId = req.user.id
    return this.statisticsService.getMonthlyStats(userId);
  }

  @Get('/yearly')
  findYearlyStats(@Req() req: any ) {
    const userId = req.user.id
    return this.statisticsService.getYearlyStats(userId);
  } 

}
