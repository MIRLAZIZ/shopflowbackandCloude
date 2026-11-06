import {
  Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query,
} from '@nestjs/common';
import { FinanceService } from './finance.service';
import {
  AddSupplierPaymentDto, CreateAdjustmentDto, CreateSupplierDebtDto,
  CreateSupplierDto, SetOpeningDto, UpdateSupplierDto,
} from './dto/finance.dto';
import { CurrentUser } from 'common/decorators/current-user.decarotor';
import { AuthUserPayload, getOwnerId } from 'common/utils/owner.util';
import { Roles } from 'common/decorators/roles.decorator';
import { Role } from 'common/enums/role.enum';

// Moliya — faqat do'kon egasi (Client) uchun
@Controller('finance')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  // ── Aylanma aktivlar ──
  @Get('assets')
  @Roles(Role.Client)
  assets(@CurrentUser() user: AuthUserPayload) {
    return this.financeService.getAssets(getOwnerId(user));
  }

  // ── Boshlang'ich qoldiq ──
  @Get('opening')
  @Roles(Role.Client)
  getOpening(@CurrentUser() user: AuthUserPayload) {
    return this.financeService.getOpening(getOwnerId(user));
  }

  @Put('opening')
  @Roles(Role.Client)
  setOpening(@Body() dto: SetOpeningDto, @CurrentUser() user: AuthUserPayload) {
    return this.financeService.setOpening(getOwnerId(user), user, dto);
  }

  // ── Qo'lda pul harakati ──
  @Get('adjustments')
  @Roles(Role.Client)
  listAdjustments(@CurrentUser() user: AuthUserPayload, @Query('page') page?: string) {
    return this.financeService.listAdjustments(getOwnerId(user), page ? Number(page) : 1);
  }

  @Post('adjustments')
  @Roles(Role.Client)
  createAdjustment(@Body() dto: CreateAdjustmentDto, @CurrentUser() user: AuthUserPayload) {
    return this.financeService.createAdjustment(getOwnerId(user), user, dto);
  }

  @Delete('adjustments/:id')
  @Roles(Role.Client)
  removeAdjustment(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUserPayload) {
    return this.financeService.removeAdjustment(id, getOwnerId(user), user);
  }

  // ── Yetkazib beruvchilar ──
  @Get('suppliers')
  @Roles(Role.Client)
  listSuppliers(@CurrentUser() user: AuthUserPayload) {
    return this.financeService.listSuppliers(getOwnerId(user));
  }

  @Post('suppliers')
  @Roles(Role.Client)
  createSupplier(@Body() dto: CreateSupplierDto, @CurrentUser() user: AuthUserPayload) {
    return this.financeService.createSupplier(getOwnerId(user), user, dto);
  }

  @Put('suppliers/:id')
  @Roles(Role.Client)
  updateSupplier(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSupplierDto,
    @CurrentUser() user: AuthUserPayload,
  ) {
    return this.financeService.updateSupplier(id, getOwnerId(user), user, dto);
  }

  @Delete('suppliers/:id')
  @Roles(Role.Client)
  removeSupplier(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUserPayload) {
    return this.financeService.removeSupplier(id, getOwnerId(user), user);
  }

  // ── Yetkazib beruvchiga qarz (kreditorlik) ──
  @Get('supplier-debts')
  @Roles(Role.Client)
  listDebts(
    @CurrentUser() user: AuthUserPayload,
    @Query('page') page?: string,
    @Query('status') status?: string,
    @Query('supplierId') supplierId?: string,
  ) {
    return this.financeService.listDebts(getOwnerId(user), page ? Number(page) : 1, 20, {
      status,
      supplierId: supplierId ? Number(supplierId) : undefined,
    });
  }

  @Post('supplier-debts')
  @Roles(Role.Client)
  createDebt(@Body() dto: CreateSupplierDebtDto, @CurrentUser() user: AuthUserPayload) {
    return this.financeService.createDebt(getOwnerId(user), user, dto);
  }

  @Get('supplier-debts/:id')
  @Roles(Role.Client)
  getDebt(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUserPayload) {
    return this.financeService.getDebt(id, getOwnerId(user));
  }

  @Post('supplier-debts/:id/payments')
  @Roles(Role.Client)
  addPayment(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddSupplierPaymentDto,
    @CurrentUser() user: AuthUserPayload,
  ) {
    return this.financeService.addPayment(id, getOwnerId(user), user, dto);
  }

  @Post('supplier-debts/:id/cancel')
  @Roles(Role.Client)
  cancelDebt(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUserPayload) {
    return this.financeService.cancelDebt(id, getOwnerId(user), user);
  }
}
