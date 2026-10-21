import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ExpenseService } from './expense.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { CreateExpenseCategoryDto, UpdateExpenseCategoryDto } from './dto/expense-category.dto';
import { CurrentUser } from 'common/decorators/current-user.decarotor';
import { AuthUserPayload, getOwnerId } from 'common/utils/owner.util';
import { Roles } from 'common/decorators/roles.decorator';
import { Role } from 'common/enums/role.enum';

// Xarajatlar — moliyaviy ma'lumot, shuning uchun faqat do'kon egasi (Client).
// Kassirga ochish kerak bo'lsa — @Roles(Role.Client, Role.Cashier) qiling.
@Controller('expenses')
export class ExpenseController {
  constructor(private readonly expenseService: ExpenseService) {}

  // ⚠️ "categories" va "summary" yo'llari ':id' dan OLDIN turishi shart —
  // aks holda ParseIntPipe ularni raqam deb o'qishga urinadi.

  @Get('categories')
  @Roles(Role.Client)
  listCategories(@CurrentUser() user: AuthUserPayload) {
    return this.expenseService.listCategories(getOwnerId(user));
  }

  @Post('categories')
  @Roles(Role.Client)
  createCategory(@Body() dto: CreateExpenseCategoryDto, @CurrentUser() user: AuthUserPayload) {
    return this.expenseService.createCategory(getOwnerId(user), dto);
  }

  @Put('categories/:id')
  @Roles(Role.Client)
  updateCategory(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateExpenseCategoryDto,
    @CurrentUser() user: AuthUserPayload,
  ) {
    return this.expenseService.updateCategory(id, getOwnerId(user), dto);
  }

  @Delete('categories/:id')
  @Roles(Role.Client)
  removeCategory(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUserPayload) {
    return this.expenseService.removeCategory(id, getOwnerId(user));
  }

  @Get('summary')
  @Roles(Role.Client)
  getSummary(
    @CurrentUser() user: AuthUserPayload,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.expenseService.getSummary(getOwnerId(user), dateFrom, dateTo);
  }

  @Get()
  @Roles(Role.Client)
  findAll(
    @CurrentUser() user: AuthUserPayload,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('categoryId') categoryId?: string,
    @Query('paymentType') paymentType?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('search') search?: string,
  ) {
    return this.expenseService.findAll(
      getOwnerId(user),
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
      {
        categoryId: categoryId ? Number(categoryId) : undefined,
        paymentType,
        dateFrom,
        dateTo,
        search,
      },
    );
  }

  @Post()
  @Roles(Role.Client)
  create(@Body() dto: CreateExpenseDto, @CurrentUser() user: AuthUserPayload) {
    return this.expenseService.create(getOwnerId(user), user, dto);
  }

  @Get(':id')
  @Roles(Role.Client)
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUserPayload) {
    return this.expenseService.findOne(id, getOwnerId(user));
  }

  @Put(':id')
  @Roles(Role.Client)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateExpenseDto,
    @CurrentUser() user: AuthUserPayload,
  ) {
    return this.expenseService.update(id, getOwnerId(user), user, dto);
  }

  @Delete(':id')
  @Roles(Role.Client)
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUserPayload) {
    return this.expenseService.remove(id, getOwnerId(user), user);
  }
}
