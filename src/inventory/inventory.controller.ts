import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { StartSessionDto, RecordCountDto, CompleteSessionDto } from './dto/inventory.dto';
import { CurrentUser } from 'common/decorators/current-user.decarotor';
import { AuthUserPayload, getOwnerId } from 'common/utils/owner.util';
import { Roles } from 'common/decorators/roles.decorator';
import { Role } from 'common/enums/role.enum';

@Controller('inventory/sessions')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post()
  @Roles(Role.Client, Role.Cashier)
  start(@Body() dto: StartSessionDto, @CurrentUser() user: AuthUserPayload) {
    return this.inventoryService.startSession(getOwnerId(user), user.id, dto.note);
  }

  @Get()
  @Roles(Role.Client, Role.Cashier)
  findAll(@CurrentUser() user: AuthUserPayload, @Query('page') page?: string) {
    return this.inventoryService.listSessions(getOwnerId(user), page ? Number(page) : 1);
  }

  @Get(':id')
  @Roles(Role.Client, Role.Cashier)
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUserPayload) {
    return this.inventoryService.getSession(id, getOwnerId(user));
  }

  @Post(':id/count')
  @Roles(Role.Client, Role.Cashier)
  count(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RecordCountDto,
    @CurrentUser() user: AuthUserPayload,
  ) {
    return this.inventoryService.recordCount(id, getOwnerId(user), dto, user.id);
  }

  // Faqat do'kon egasi yakunlab, tizimdagi qoldiqlarni real holatga
  // moslashtirishi mumkin — bu qaytarib bo'lmaydigan amal
  @Post(':id/complete')
  @Roles(Role.Client)
  complete(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CompleteSessionDto,
    @CurrentUser() user: AuthUserPayload,
  ) {
    return this.inventoryService.completeSession(id, getOwnerId(user), user.id, dto.note);
  }

  @Post(':id/cancel')
  @Roles(Role.Client, Role.Cashier)
  cancel(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUserPayload) {
    return this.inventoryService.cancelSession(id, getOwnerId(user));
  }
}
