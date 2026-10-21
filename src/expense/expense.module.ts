import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExpenseService } from './expense.service';
import { ExpenseController } from './expense.controller';
import { Expense } from './entities/expense.entity';
import { ExpenseCategory } from './entities/expense-category.entity';
import { AuditModule } from 'src/audit/audit.module';

@Module({
  imports: [TypeOrmModule.forFeature([Expense, ExpenseCategory]), AuditModule],
  controllers: [ExpenseController],
  providers: [ExpenseService],
  exports: [ExpenseService],
})
export class ExpenseModule {}
