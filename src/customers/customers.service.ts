import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from './entities/customer.entity';
import { Debt } from 'src/debts/entities/debt.entity';
import { DebtStatus } from 'common/enums/debt-status.enum';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/customer.dto';
import { PaginationResponse } from 'common/interface/pagination.interface';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer) private readonly customerRepository: Repository<Customer>,
    @InjectRepository(Debt) private readonly debtRepository: Repository<Debt>,
  ) {}

  async create(ownerId: number, dto: CreateCustomerDto) {
    const customer = this.customerRepository.create({
      ownerId,
      fullName: dto.fullName.trim(),
      phone: dto.phone?.trim() || null,
      note: dto.note?.trim() || null,
    });
    return this.customerRepository.save(customer);
  }

  async update(id: number, ownerId: number, dto: UpdateCustomerDto) {
    const customer = await this.findOneEntity(id, ownerId);

    if (dto.fullName !== undefined) customer.fullName = dto.fullName.trim();
    if (dto.phone !== undefined) customer.phone = dto.phone?.trim() || null;
    if (dto.note !== undefined) customer.note = dto.note?.trim() || null;

    return this.customerRepository.save(customer);
  }

  async remove(id: number, ownerId: number) {
    const customer = await this.findOneEntity(id, ownerId);

    const hasOpenDebt = await this.debtRepository.exists({
      where: { customer: { id: customer.id }, status: DebtStatus.OPEN },
    });
    if (hasOpenDebt) {
      throw new BadRequestException(
        "Bu mijozning ochiq qarzi bor — avval qarzni yoping yoki bekor qiling",
      );
    }

    await this.customerRepository.remove(customer);
    return { message: "Mijoz o'chirildi" };
  }

  async findOneEntity(id: number, ownerId: number): Promise<Customer> {
    const customer = await this.customerRepository.findOne({ where: { id, ownerId } });
    if (!customer) {
      throw new NotFoundException(`ID ${id} li mijoz topilmadi`);
    }
    return customer;
  }

  async findOne(id: number, ownerId: number) {
    const customer = await this.findOneEntity(id, ownerId);
    const totalDebt = await this.getOutstandingDebt(customer.id);
    return { ...customer, totalDebt };
  }

  async findAll(
    ownerId: number,
    page: number = 1,
    limit: number = 20,
    search?: string,
  ): Promise<PaginationResponse<any>> {
    const skip = (page - 1) * limit;
    const qb = this.customerRepository
      .createQueryBuilder('c')
      .where('c.owner_id = :ownerId', { ownerId });

    if (search?.trim()) {
      qb.andWhere('(LOWER(c.fullName) LIKE LOWER(:s) OR c.phone LIKE :s)', {
        s: `%${search.trim()}%`,
      });
    }

    const [customers, total] = await qb
      .orderBy('c.fullName', 'ASC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    // Har bir mijoz uchun ochiq qarzlar yig'indisi
    const debtSums = await this.debtRepository
      .createQueryBuilder('d')
      .select('d.customer_id', 'customerId')
      .addSelect('SUM(d.remainingAmount)', 'total')
      .where('d.customer_id IN (:...ids)', {
        ids: customers.length ? customers.map((c) => c.id) : [0],
      })
      .andWhere('d.status = :status', { status: DebtStatus.OPEN })
      .groupBy('d.customer_id')
      .getRawMany();

    const debtMap = new Map(debtSums.map((row) => [Number(row.customerId), Number(row.total)]));

    return {
      data: customers.map((c) => ({ ...c, totalDebt: debtMap.get(c.id) ?? 0 })),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Mijozning qarz tarixi: har bir qarz, unga qilingan to'lovlar va qarz
   * bog'langan chek (nima olgani — mahsulotlar, miqdori, birligi bilan).
   */
  async getDebtHistory(id: number, ownerId: number) {
    const customer = await this.findOneEntity(id, ownerId);

    const debts = await this.debtRepository.find({
      where: { ownerId, customer: { id: customer.id } },
      relations: ['order', 'order.items', 'order.items.product', 'order.items.product.unit', 'payments'],
      order: { createdAt: 'DESC' },
    });

    const round2 = (v: number) => Math.round(v * 100) / 100;
    const active = debts.filter(d => d.status !== DebtStatus.CANCELLED);

    return {
      customer: { id: customer.id, fullName: customer.fullName, phone: customer.phone },
      summary: {
        totalDebt: round2(active.reduce((sum, d) => sum + d.amount, 0)),
        totalPaid: round2(active.reduce((sum, d) => sum + d.paidAmount, 0)),
        totalRemaining: round2(
          debts.filter(d => d.status === DebtStatus.OPEN).reduce((sum, d) => sum + d.remainingAmount, 0),
        ),
      },
      debts: debts.map(d => ({
        id: d.id,
        amount: d.amount,
        paidAmount: d.paidAmount,
        remainingAmount: d.remainingAmount,
        status: d.status,
        dueDate: d.dueDate,
        note: d.note,
        createdAt: d.createdAt,
        order: d.order
          ? {
              id: d.order.id,
              createdAt: d.order.createdAt,
              total: d.order.total,
              paidAmount: d.order.paidAmount,
              debtAmount: d.order.debtAmount,
              status: d.order.status,
              items: (d.order.items ?? []).map(i => ({
                productName: i.product?.name ?? '-',
                unit: (i.product as any)?.unit?.label ?? null,
                quantity: i.quantity,
                price: i.selling_price,
                discount: i.discount,
                total: i.total,
              })),
            }
          : null,
        payments: (d.payments ?? [])
          .slice()
          .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
          .map(pmt => ({
            id: pmt.id,
            amount: pmt.amount,
            paymentType: pmt.paymentType,
            note: pmt.note,
            createdAt: pmt.createdAt,
          })),
      })),
    };
  }

  private async getOutstandingDebt(customerId: number): Promise<number> {
    const { total } = await this.debtRepository
      .createQueryBuilder('d')
      .select('SUM(d.remainingAmount)', 'total')
      .where('d.customer_id = :customerId', { customerId })
      .andWhere('d.status = :status', { status: DebtStatus.OPEN })
      .getRawOne();

    return Number(total) || 0;
  }
}
