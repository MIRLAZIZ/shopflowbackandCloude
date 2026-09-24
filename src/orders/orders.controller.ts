import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { CreateReturnDto } from './dto/create-return.dto';
import { Roles } from 'common/decorators/roles.decorator';
import { Role } from 'common/enums/role.enum';
import { CurrentUser } from 'common/decorators/current-user.decarotor';
import { AuthUserPayload } from 'common/utils/owner.util';
import { OrderSearchParams } from 'common/interface/order-search';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @Roles(Role.Client, Role.Cashier)
  create(@Body() dto: CreateOrderDto, @CurrentUser() user: AuthUserPayload) {
    return this.ordersService.create(dto, user);
  }

  @Get('search')
  @Roles(Role.Client, Role.Cashier)
  search(
    @CurrentUser() user: AuthUserPayload,
    @Query() params: OrderSearchParams,
    @Query('page') page?: string,
  ) {
    return this.ordersService.search(user, params, page ? Number(page) : 1);
  }

  // ⚠️ ':id' dan OLDIN e'lon qilinishi shart, aks holda "returns" ID
  // sifatida talqin qilinib qoladi
  @Get('returns')
  @Roles(Role.Client, Role.Cashier)
  getReturns(@CurrentUser() user: AuthUserPayload, @Query('page') page?: string) {
    return this.ordersService.getReturns(user, page ? Number(page) : 1);
  }

  @Get()
  @Roles(Role.Client, Role.Cashier)
  findAll(@CurrentUser() user: AuthUserPayload, @Query('page') page?: string) {
    return this.ordersService.findAll(user, page ? Number(page) : 1);
  }

  @Get(':id')
  @Roles(Role.Client, Role.Cashier)
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUserPayload) {
    return this.ordersService.findOne(id, user);
  }

  @Post('cancel/:id')
  @Roles(Role.Client, Role.Cashier)
  cancel(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUserPayload,
    @Body() body: { reason?: string },
  ) {
    return this.ordersService.cancel(id, user, body?.reason);
  }

  @Post(':id/returns')
  @Roles(Role.Client, Role.Cashier)
  createReturn(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateReturnDto,
    @CurrentUser() user: AuthUserPayload,
  ) {
    return this.ordersService.createReturn(id, dto, user);
  }

  @Get(':id/returns')
  @Roles(Role.Client, Role.Cashier)
  getOrderReturns(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUserPayload) {
    return this.ordersService.getOrderReturns(id, user);
  }
}
