import { Controller, Get, Query } from '@nestjs/common';
import { AuditService } from './audit.service';
import { CurrentUser } from 'common/decorators/current-user.decarotor';
import { AuthUserPayload, getOwnerId } from 'common/utils/owner.util';
import { Roles } from 'common/decorators/roles.decorator';
import { Role } from 'common/enums/role.enum';

// Faqat do'kon egasi (Client) ko'ra oladi — kuzatuv jurnali xodimlar
// ustidan nazorat vositasi, shuning uchun xodimlarga ochilmaydi.
@Controller('audit-logs')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @Roles(Role.Client)
  findAll(
    @CurrentUser() user: AuthUserPayload,
    @Query('page') page?: string,
    @Query('entityType') entityType?: string,
    @Query('action') action?: string,
    @Query('userId') userId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.auditService.findAll(
      getOwnerId(user),
      page ? Number(page) : 1,
      30,
      {
        entityType,
        action,
        userId: userId ? Number(userId) : undefined,
        dateFrom,
        dateTo,
      },
    );
  }
}
