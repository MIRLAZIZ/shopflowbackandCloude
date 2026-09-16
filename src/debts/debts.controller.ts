import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { DebtsService } from './debts.service';
import { AddDebtPaymentDto, CreateManualDebtDto } from './dto/debt.dto';
import { CurrentUser } from 'common/decorators/current-user.decarotor';
import { AuthUserPayload, getOwnerId } from 'common/utils/owner.util';
import { Roles } from 'common/decorators/roles.decorator';
import { Role } from 'common/enums/role.enum';

@Controller('debts')
export class DebtsController {
  constructor(private readonly debtsService: DebtsService) {}

  @Post()
  @Roles(Role.Client, Role.Cashier)
  create(@Body() dto: CreateManualDebtDto, @CurrentUser() user: AuthUserPayload) {
    return this.debtsService.createManual(getOwnerId(user), dto);
  }

  @Get()
  @Roles(Role.Client, Role.Cashier)
  findAll(
    @CurrentUser() user: AuthUserPayload,
    @Query('page') page?: string,
    @Query('status') status?: string,
    @Query('customerId') customerId?: string,
  ) {
    return this.debtsService.findAll(
      getOwnerId(user),
      page ? Number(page) : 1,
      20,
      status,
      customerId ? Number(customerId) : undefined,
    );
  }

  @Get('overdue')
  @Roles(Role.Client, Role.Cashier)
  getOverdue(@CurrentUser() user: AuthUserPayload) {
    return this.debtsService.getOverdue(getOwnerId(user));
  }

  @Get(':id')
  @Roles(Role.Client, Role.Cashier)
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUserPayload) {
    return this.debtsService.findOne(id, getOwnerId(user));
  }

  @Post(':id/payments')
  @Roles(Role.Client, Role.Cashier)
  addPayment(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddDebtPaymentDto,
    @CurrentUser() user: AuthUserPayload,
  ) {
    return this.debtsService.addPayment(id, getOwnerId(user), dto, user.id);
  }
}
