import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Debt } from './entities/debt.entity';
import { DebtPayment } from './entities/debt-payment.entity';
import { Customer } from 'src/customers/entities/customer.entity';
import { DebtStatus } from 'common/enums/debt-status.enum';
import { AddDebtPaymentDto, CreateManualDebtDto } from './dto/debt.dto';
import { PaginationResponse } from 'common/interface/pagination.interface';

const round2 = (value: number) => Math.round(value * 100) / 100;

@Injectable()
export class DebtsService {
  constructor(
    @InjectRepository(Debt) private readonly debtRepository: Repository<Debt>,
    @InjectRepository(Customer) private readonly customerRepository: Repository<Customer>,
  ) {}

  /**
   * OrdersService.create() ichidan, chekni saqlayotgan TRANZAKSIYaning
   * o'zida chaqiriladi — shu sabab EntityManager qabul qiladi, o'z
   * repository'sidan foydalanmaydi.
   */
  async createFromOrder(
    manager: EntityManager,
    params: { ownerId: number; orderId: number; customerId: number; amount: number },
  ): Promise<Debt> {
    const customer = await manager.findOne(Customer, {
      where: { id: params.customerId, ownerId: params.ownerId },
    });
    if (!customer) {
      throw new BadRequestException(
        `ID ${params.customerId} li mijoz topilmadi — qarz shu mijozga yozilmadi`,
      );
    }

    const debt = manager.create(Debt, {
      ownerId: params.ownerId,
      customer,
      order: { id: params.orderId } as any,
      amount: round2(params.amount),
      paidAmount: 0,
      remainingAmount: round2(params.amount),
      status: DebtStatus.OPEN,
    });

    return manager.save(Debt, debt);
  }

  /**
   * Chek bekor qilinganda (OrdersService.cancel ichida, xuddi shu
   * tranzaksiyada) bog'liq qarzni ham bekor qiladi. Agar qarz bo'yicha
   * allaqachon to'lov qilingan bo'lsa — avtomatik bekor qilinmaydi, chunki
   * pulni qaytarish alohida qaror talab qiladi.
   */
  async cancelForOrder(manager: EntityManager, orderId: number): Promise<void> {
    const debt = await manager.findOne(Debt, { where: { order: { id: orderId } } });
    if (!debt) return;

    if (debt.paidAmount > 0) {
      throw new BadRequestException(
        "Bu chek bo'yicha qarzga allaqachon to'lov qilingan — avval qarz bo'limida hal qiling, keyin chekni bekor qiling",
      );
    }

    debt.status = DebtStatus.CANCELLED;
    debt.remainingAmount = 0;
    await manager.save(Debt, debt);
  }

  async createManual(ownerId: number, dto: CreateManualDebtDto): Promise<Debt> {
    const customer = await this.customerRepository.findOne({
      where: { id: dto.customerId, ownerId },
    });
    if (!customer) {
      throw new NotFoundException(`ID ${dto.customerId} li mijoz topilmadi`);
    }

    const debt = this.debtRepository.create({
      ownerId,
      customer,
      order: null,
      amount: round2(dto.amount),
      paidAmount: 0,
      remainingAmount: round2(dto.amount),
      status: DebtStatus.OPEN,
      note: dto.note?.trim() || null,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
    });

    return this.debtRepository.save(debt);
  }

  async addPayment(debtId: number, ownerId: number, dto: AddDebtPaymentDto, userId: number) {
    return this.debtRepository.manager.transaction(async (manager) => {
      const debt = await manager.findOne(Debt, {
        where: { id: debtId, ownerId },
        relations: ['customer'],
      });
      if (!debt) {
        throw new NotFoundException(`ID ${debtId} li qarz topilmadi`);
      }
      if (debt.status !== DebtStatus.OPEN) {
        throw new BadRequestException(`Bu qarz ${debt.status} holatida — to'lov qo'shib bo'lmaydi`);
      }
      if (dto.amount > debt.remainingAmount + 0.05) {
        throw new BadRequestException(
          `To'lov summasi (${dto.amount}) qolgan qarzdan (${debt.remainingAmount}) katta`,
        );
      }

      const payment = manager.create(DebtPayment, {
        debt,
        amount: round2(dto.amount),
        paymentType: dto.paymentType,
        note: dto.note?.trim() || null,
        createdBy: userId,
      });
      await manager.save(DebtPayment, payment);

      debt.paidAmount = round2(debt.paidAmount + dto.amount);
      debt.remainingAmount = round2(debt.amount - debt.paidAmount);
      if (debt.remainingAmount <= 0.05) {
        debt.remainingAmount = 0;
        debt.status = DebtStatus.PAID;
      }
      await manager.save(Debt, debt);

      return debt;
    });
  }

  async findOne(id: number, ownerId: number) {
    const debt = await this.debtRepository.findOne({
      where: { id, ownerId },
      relations: ['customer', 'order', 'payments'],
      order: { payments: { createdAt: 'ASC' } as any },
    });
    if (!debt) {
      throw new NotFoundException(`ID ${id} li qarz topilmadi`);
    }
    return debt;
  }

  async findAll(
    ownerId: number,
    page: number = 1,
    limit: number = 20,
    status?: string,
    customerId?: number,
  ): Promise<PaginationResponse<Debt>> {
    const skip = (page - 1) * limit;
    const qb = this.debtRepository
      .createQueryBuilder('d')
      .leftJoinAndSelect('d.customer', 'customer')
      .leftJoinAndSelect('d.order', 'order')
      .where('d.owner_id = :ownerId', { ownerId });

    if (status) qb.andWhere('d.status = :status', { status });
    if (customerId) qb.andWhere('customer.id = :customerId', { customerId });

    const [debts, total] = await qb
      .orderBy('d.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data: debts,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getOverdue(ownerId: number): Promise<Debt[]> {
    return this.debtRepository
      .createQueryBuilder('d')
      .leftJoinAndSelect('d.customer', 'customer')
      .where('d.owner_id = :ownerId', { ownerId })
      .andWhere('d.status = :status', { status: DebtStatus.OPEN })
      .andWhere('d.dueDate IS NOT NULL AND d.dueDate < :now', { now: new Date() })
      .getMany();
  }
}
