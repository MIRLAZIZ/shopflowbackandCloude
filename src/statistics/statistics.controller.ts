import { Controller, Get, Query } from '@nestjs/common';
import { StatisticsService } from './statistics.service';
import { CurrentUser } from 'common/decorators/current-user.decarotor';
import { AuthUserPayload, getOwnerId } from 'common/utils/owner.util';
import { Roles } from 'common/decorators/roles.decorator';
import { Role } from 'common/enums/role.enum';

// ⚠️ Avval bu yerda req.user.id to'g'ridan-to'g'ri ishlatilgan edi — kassir
// kirsa, statistika bo'sh chiqar edi (chunki yozuvlar ownerId bo'yicha
// saqlanadi, kassirning shaxsiy ID'si bo'yicha emas). Endi getOwnerId
// orqali to'g'rilandi.
@Controller('statistics')
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get('dashboard')
  @Roles(Role.Client, Role.Cashier)
  getDashboard(
    @CurrentUser() user: AuthUserPayload,
    @Query('period') period?: 'today' | 'week' | 'month' | 'year',
  ) {
    return this.statisticsService.getDashboard(getOwnerId(user), period || 'week');
  }

  @Get('today')
  @Roles(Role.Client, Role.Cashier)
  findTodayStats(@CurrentUser() user: AuthUserPayload) {
    return this.statisticsService.getTodayStats(getOwnerId(user));
  }

  @Get('weekly')
  @Roles(Role.Client, Role.Cashier)
  findWeeklyStats(@CurrentUser() user: AuthUserPayload) {
    return this.statisticsService.weeklyStats(getOwnerId(user));
  }

  @Get('monthly')
  @Roles(Role.Client, Role.Cashier)
  findMonthlyStats(@CurrentUser() user: AuthUserPayload) {
    return this.statisticsService.getMonthlyStats(getOwnerId(user));
  }

  @Get('yearly')
  @Roles(Role.Client, Role.Cashier)
  findYearlyStats(@CurrentUser() user: AuthUserPayload) {
    return this.statisticsService.getYearlyStats(getOwnerId(user));
  }
}
