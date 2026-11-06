import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FinanceService } from './finance.service';
import { FinanceController } from './finance.controller';
import { Supplier } from './entities/supplier.entity';
import { SupplierDebt } from './entities/supplier-debt.entity';
import { SupplierPayment } from './entities/supplier-payment.entity';
import { FinanceOpening } from './entities/finance-opening.entity';
import { CashAdjustment } from './entities/cash-adjustment.entity';
import { ProductBatch } from 'src/products/entities/product-batch.entity';
import { Order } from 'src/orders/entities/order.entity';
import { OrderReturn } from 'src/orders/entities/order-return.entity';
import { Debt } from 'src/debts/entities/debt.entity';
import { DebtPayment } from 'src/debts/entities/debt-payment.entity';
import { Expense } from 'src/expense/entities/expense.entity';
import { AuditModule } from 'src/audit/audit.module';

@Module({
  // Boshqa modullar emas, faqat ularning entity'lari ro'yxatdan o'tkaziladi —
  // circular dependency bo'lmasligi uchun (hisobot ularni faqat o'qiydi)
  imports: [
    TypeOrmModule.forFeature([
      Supplier, SupplierDebt, SupplierPayment, FinanceOpening, CashAdjustment,
      ProductBatch, Order, OrderReturn, Debt, DebtPayment, Expense,
    ]),
    AuditModule,
  ],
  controllers: [FinanceController],
  providers: [FinanceService],
  exports: [FinanceService],
})
export class FinanceModule {}
