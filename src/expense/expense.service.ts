import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Expense } from './entities/expense.entity';
import { ExpenseCategory } from './entities/expense-category.entity';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { CreateExpenseCategoryDto, UpdateExpenseCategoryDto } from './dto/expense-category.dto';
import { AuditService } from 'src/audit/audit.service';
import { AuditAction } from 'src/audit/entities/audit-log.entity';
import { AuthUserPayload } from 'common/utils/owner.util';

const round2 = (v: number) => Math.round(v * 100) / 100;

// Yangi do'kon egasi birinchi marta kirganda avtomatik yaratiladigan kategoriyalar
const DEFAULT_CATEGORIES: { name: string; color: string }[] = [
  { name: 'Ijara', color: '#7367F0' },
  { name: 'Maosh', color: '#28C76F' },
  { name: 'Kommunal xizmatlar', color: '#00CFE8' },
  { name: 'Transport', color: '#FF9F43' },
  { name: 'Soliq', color: '#EA5455' },
  { name: 'Reklama', color: '#A8AAAE' },
  { name: "Ta'mirlash", color: '#FF6B9D' },
  { name: 'Boshqa', color: '#4B4B4B' },
];

export interface ExpenseFilters {
  categoryId?: number;
  paymentType?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

@Injectable()
export class ExpenseService {
  constructor(
    @InjectRepository(Expense) private readonly expenseRepository: Repository<Expense>,
    @InjectRepository(ExpenseCategory) private readonly categoryRepository: Repository<ExpenseCategory>,
    private readonly auditService: AuditService,
  ) {}

  // ═══════════════════════════ KATEGORIYALAR ═══════════════════════════

  async listCategories(ownerId: number) {
    let categories = await this.categoryRepository.find({ where: { ownerId }, order: { name: 'ASC' } });

    // Birinchi marta — standart kategoriyalarni yaratamiz
    if (!categories.length) {
      await this.categoryRepository.save(
        DEFAULT_CATEGORIES.map(c => this.categoryRepository.create({ ownerId, name: c.name, color: c.color })),
      );
      categories = await this.categoryRepository.find({ where: { ownerId }, order: { name: 'ASC' } });
    }
    return categories;
  }

  async createCategory(ownerId: number, dto: CreateExpenseCategoryDto) {
    const name = dto.name.trim();
    if (!name) throw new BadRequestException("Kategoriya nomi bo'sh bo'lmasligi kerak");

    const exists = await this.categoryRepository.exists({ where: { ownerId, name } });
    if (exists) throw new BadRequestException(`"${name}" kategoriyasi allaqachon mavjud`);

    return this.categoryRepository.save(
      this.categoryRepository.create({ ownerId, name, color: dto.color ?? null }),
    );
  }

  async updateCategory(id: number, ownerId: number, dto: UpdateExpenseCategoryDto) {
    const category = await this.findCategory(id, ownerId);

    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (!name) throw new BadRequestException("Kategoriya nomi bo'sh bo'lmasligi kerak");
      if (name !== category.name) {
        const exists = await this.categoryRepository.exists({ where: { ownerId, name } });
        if (exists) throw new BadRequestException(`"${name}" kategoriyasi allaqachon mavjud`);
      }
      category.name = name;
    }
    if (dto.color !== undefined) category.color = dto.color;

    return this.categoryRepository.save(category);
  }

  async removeCategory(id: number, ownerId: number) {
    const category = await this.findCategory(id, ownerId);

    const used = await this.expenseRepository.exists({ where: { ownerId, category: { id } } });
    if (used) {
      throw new BadRequestException(
        "Bu kategoriyada xarajatlar bor — avval ularni boshqa kategoriyaga o'tkazing yoki o'chiring",
      );
    }
    await this.categoryRepository.remove(category);
    return { message: "Kategoriya o'chirildi" };
  }

  private async findCategory(id: number, ownerId: number) {
    const category = await this.categoryRepository.findOne({ where: { id, ownerId } });
    if (!category) throw new NotFoundException(`ID ${id} li kategoriya topilmadi`);
    return category;
  }

  // ═══════════════════════════ XARAJATLAR ═══════════════════════════

  private todayStr(): string {
    const d = new Date();
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }

  async create(ownerId: number, actor: AuthUserPayload, dto: CreateExpenseDto) {
    const category = await this.findCategory(dto.categoryId, ownerId);

    const expense = this.expenseRepository.create({
      ownerId,
      category,
      amount: round2(dto.amount),
      paymentType: dto.paymentType ?? 'cash',
      expenseDate: dto.expenseDate ?? this.todayStr(),
      note: dto.note?.trim() || null,
      createdBy: actor.id,
      createdByName: actor.username ?? null,
    });
    const saved = await this.expenseRepository.save(expense);

    await this.auditService.log({
      ownerId,
      userId: actor.id,
      userName: actor.username ?? null,
      action: AuditAction.CREATE,
      entityType: 'Expense',
      entityId: saved.id,
      entityLabel: `${category.name}: ${saved.amount}`,
      description: `Xarajat qo'shildi: ${category.name} — ${saved.amount} so'm`,
    });

    return this.toResponse(saved, category);
  }

  async update(id: number, ownerId: number, actor: AuthUserPayload, dto: UpdateExpenseDto) {
    const expense = await this.expenseRepository.findOne({
      where: { id, ownerId },
      relations: ['category'],
    });
    if (!expense) throw new NotFoundException(`ID ${id} li xarajat topilmadi`);

    const before = {
      category: expense.category.name,
      amount: expense.amount,
      paymentType: expense.paymentType,
      expenseDate: expense.expenseDate,
      note: expense.note,
    };

    if (dto.categoryId !== undefined && dto.categoryId !== expense.category.id) {
      expense.category = await this.findCategory(dto.categoryId, ownerId);
    }
    if (dto.amount !== undefined) expense.amount = round2(dto.amount);
    if (dto.paymentType !== undefined) expense.paymentType = dto.paymentType;
    if (dto.expenseDate !== undefined) expense.expenseDate = dto.expenseDate;
    if (dto.note !== undefined) expense.note = dto.note.trim() || null;

    const saved = await this.expenseRepository.save(expense);

    const changes = this.auditService.diff(before, {
      category: saved.category.name,
      amount: saved.amount,
      paymentType: saved.paymentType,
      expenseDate: saved.expenseDate,
      note: saved.note,
    });
    if (changes) {
      await this.auditService.log({
        ownerId,
        userId: actor.id,
        userName: actor.username ?? null,
        action: AuditAction.UPDATE,
        entityType: 'Expense',
        entityId: saved.id,
        entityLabel: `${saved.category.name}: ${saved.amount}`,
        changes,
        description: `Xarajat #${saved.id} yangilandi`,
      });
    }

    return this.toResponse(saved, saved.category);
  }

  async remove(id: number, ownerId: number, actor: AuthUserPayload) {
    const expense = await this.expenseRepository.findOne({
      where: { id, ownerId },
      relations: ['category'],
    });
    if (!expense) throw new NotFoundException(`ID ${id} li xarajat topilmadi`);

    const label = `${expense.category.name}: ${expense.amount}`;
    await this.expenseRepository.remove(expense);

    await this.auditService.log({
      ownerId,
      userId: actor.id,
      userName: actor.username ?? null,
      action: AuditAction.DELETE,
      entityType: 'Expense',
      entityId: id,
      entityLabel: label,
      description: `Xarajat o'chirildi: ${label} so'm`,
    });

    return { message: "Xarajat o'chirildi" };
  }

  async findOne(id: number, ownerId: number) {
    const expense = await this.expenseRepository.findOne({
      where: { id, ownerId },
      relations: ['category'],
    });
    if (!expense) throw new NotFoundException(`ID ${id} li xarajat topilmadi`);
    return this.toResponse(expense, expense.category);
  }

  private applyFilters(
    qb: ReturnType<Repository<Expense>['createQueryBuilder']>,
    ownerId: number,
    f: ExpenseFilters,
  ) {
    qb.where('e.ownerId = :ownerId', { ownerId });
    if (f.categoryId) qb.andWhere('c.id = :categoryId', { categoryId: f.categoryId });
    if (f.paymentType) qb.andWhere('e.paymentType = :paymentType', { paymentType: f.paymentType });
    if (f.dateFrom) qb.andWhere('e.expenseDate >= :dateFrom', { dateFrom: f.dateFrom });
    if (f.dateTo) qb.andWhere('e.expenseDate <= :dateTo', { dateTo: f.dateTo });
    if (f.search?.trim()) qb.andWhere('e.note LIKE :search', { search: `%${f.search.trim()}%` });
    return qb;
  }

  async findAll(ownerId: number, page: number = 1, limit: number = 20, filters: ExpenseFilters = {}) {
    const skip = (page - 1) * limit;

    const listQb = this.expenseRepository.createQueryBuilder('e').leftJoinAndSelect('e.category', 'c');
    this.applyFilters(listQb, ownerId, filters);
    const [rows, total] = await listQb
      .orderBy('e.expenseDate', 'DESC')
      .addOrderBy('e.id', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    // Filtrga mos BARCHA xarajatlar yig'indisi (faqat joriy sahifa emas)
    const sumQb = this.expenseRepository
      .createQueryBuilder('e')
      .leftJoin('e.category', 'c')
      .select('COALESCE(SUM(e.amount), 0)', 'sum');
    this.applyFilters(sumQb, ownerId, filters);
    const { sum } = await sumQb.getRawOne();

    return {
      data: rows.map(r => this.toResponse(r, r.category)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
      summary: { total: round2(Number(sum) || 0) },
    };
  }

  /**
   * Davr bo'yicha xulosa: jami, kategoriyalar, to'lov turlari va kunlik
   * kesim (grafik uchun).
   */
  async getSummary(ownerId: number, dateFrom?: string, dateTo?: string) {
    const filters: ExpenseFilters = { dateFrom, dateTo };

    const totalQb = this.expenseRepository
      .createQueryBuilder('e')
      .leftJoin('e.category', 'c')
      .select('COALESCE(SUM(e.amount), 0)', 'sum')
      .addSelect('COUNT(e.id)', 'count');
    this.applyFilters(totalQb, ownerId, filters);
    const totals = await totalQb.getRawOne();

    const catQb = this.expenseRepository
      .createQueryBuilder('e')
      .leftJoin('e.category', 'c')
      .select('c.id', 'categoryId')
      .addSelect('c.name', 'name')
      .addSelect('c.color', 'color')
      .addSelect('SUM(e.amount)', 'total')
      .addSelect('COUNT(e.id)', 'count')
      .groupBy('c.id')
      .addGroupBy('c.name')
      .addGroupBy('c.color')
      .orderBy('total', 'DESC');
    this.applyFilters(catQb, ownerId, filters);
    const byCategory = await catQb.getRawMany();

    const payQb = this.expenseRepository
      .createQueryBuilder('e')
      .leftJoin('e.category', 'c')
      .select('e.paymentType', 'paymentType')
      .addSelect('SUM(e.amount)', 'total')
      .groupBy('e.paymentType');
    this.applyFilters(payQb, ownerId, filters);
    const byPaymentType = await payQb.getRawMany();

    const dayQb = this.expenseRepository
      .createQueryBuilder('e')
      .leftJoin('e.category', 'c')
      .select('e.expenseDate', 'date')
      .addSelect('SUM(e.amount)', 'total')
      .groupBy('e.expenseDate')
      .orderBy('e.expenseDate', 'ASC');
    this.applyFilters(dayQb, ownerId, filters);
    const daily = await dayQb.getRawMany();

    return {
      total: round2(Number(totals.sum) || 0),
      count: Number(totals.count) || 0,
      byCategory: byCategory.map(r => ({
        categoryId: Number(r.categoryId),
        name: r.name,
        color: r.color,
        total: round2(Number(r.total) || 0),
        count: Number(r.count) || 0,
      })),
      byPaymentType: byPaymentType.map(r => ({
        paymentType: r.paymentType,
        total: round2(Number(r.total) || 0),
      })),
      daily: daily.map(r => ({
        date: typeof r.date === 'string' ? r.date.slice(0, 10) : new Date(r.date).toISOString().slice(0, 10),
        total: round2(Number(r.total) || 0),
      })),
    };
  }

  private toResponse(expense: Expense, category: ExpenseCategory) {
    return {
      id: expense.id,
      amount: expense.amount,
      paymentType: expense.paymentType,
      expenseDate: expense.expenseDate,
      note: expense.note,
      createdBy: expense.createdBy,
      createdByName: expense.createdByName,
      createdAt: expense.createdAt,
      category: category && { id: category.id, name: category.name, color: category.color },
    };
  }
}
