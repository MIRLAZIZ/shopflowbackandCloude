import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/customer.dto';
import { CurrentUser } from 'common/decorators/current-user.decarotor';
import { AuthUserPayload, getOwnerId } from 'common/utils/owner.util';
import { Roles } from 'common/decorators/roles.decorator';
import { Role } from 'common/enums/role.enum';

@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  @Roles(Role.Client, Role.Cashier)
  create(@Body() dto: CreateCustomerDto, @CurrentUser() user: AuthUserPayload) {
    return this.customersService.create(getOwnerId(user), dto);
  }

  @Get()
  @Roles(Role.Client, Role.Cashier)
  findAll(
    @CurrentUser() user: AuthUserPayload,
    @Query('page') page?: string,
    @Query('search') search?: string,
  ) {
    return this.customersService.findAll(getOwnerId(user), page ? Number(page) : 1, 20, search);
  }

  @Get(':id')
  @Roles(Role.Client, Role.Cashier)
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUserPayload) {
    return this.customersService.findOne(id, getOwnerId(user));
  }

  @Put(':id')
  @Roles(Role.Client, Role.Cashier)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCustomerDto,
    @CurrentUser() user: AuthUserPayload,
  ) {
    return this.customersService.update(id, getOwnerId(user), dto);
  }

  @Delete(':id')
  @Roles(Role.Client)
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUserPayload) {
    return this.customersService.remove(id, getOwnerId(user));
  }
}
