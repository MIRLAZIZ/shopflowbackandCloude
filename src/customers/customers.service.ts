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
