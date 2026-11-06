import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
import { BatchStatus } from 'common/enums/batch-status.enum';
import { DebtStatus } from 'common/enums/debt-status.enum';
import { OrderStatus } from 'common/enums/order-status.enum';
import { AuditService } from 'src/audit/audit.service';
import { AuditAction } from 'src/audit/entities/audit-log.entity';
import { AuthUserPayload } from 'common/utils/owner.util';
import { PaginationResponse } from 'common/interface/pagination.interface';
import {
  AddSupplierPaymentDto,
  CreateAdjustmentDto,
  CreateSupplierDebtDto,
  CreateSupplierDto,
  SetOpeningDto,
  UpdateSupplierDto,
} from './dto/finance.dto';

const round2 = (v: number) => Math.round(v * 100) / 100;

// To'lov turi → qaysi "hamyon"ga tegishli: naqd → cash, karta/o'tkazma → bank
const bucketOf = (type: string): 'cash' | 'bank' => (type === 'cash' ? 'cash' : 'bank');

function todayStr(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

@Injectable()
export class FinanceService {
  constructor(
    @InjectRepository(Supplier) private readonly supplierRepo: Repository<Supplier>,
    @InjectRepository(SupplierDebt) private readonly supplierDebtRepo: Repository<SupplierDebt>,
    @InjectRepository(SupplierPayment) private readonly supplierPaymentRepo: Repository<SupplierPayment>,
    @InjectRepository(FinanceOpening) private readonly openingRepo: Repository<FinanceOpening>,
    @InjectRepository(CashAdjustment) private readonly adjustmentRepo: Repository<CashAdjustment>,
    @InjectRepository(ProductBatch) private readonly batchRepo: Repository<ProductBatch>,
    @InjectRepository(Order) private readonly orderRepo: Repository<Order>,
    @InjectRepository(OrderReturn) private readonly returnRepo: Repository<OrderReturn>,
    @InjectRepository(Debt) private readonly debtRepo: Repository<Debt>,
    @InjectRepository(DebtPayment) private readonly debtPaymentRepo: Repository<DebtPayment>,
    @InjectRepository(Expense) private readonly expenseRepo: Repository<Expense>,
    private readonly auditService: AuditService,
  ) {}

  // ═══════════════════════════ YETKAZIB BERUVCHILAR ═══════════════════════════

  async listSuppliers(ownerId: number) {
    const suppliers = await this.supplierRepo.find({ where: { ownerId }, order: { name: 'ASC' } });

    const rows = await this.supplierDebtRepo
      .createQueryBuilder('d')
      .select('d.supplier_id', 'supplierId')
      .addSelect('SUM(d.remainingAmount)', 'payable')
      .where('d.ownerId = :ownerId', { ownerId })
      .andWhere('d.status = :status', { status: DebtStatus.OPEN })
      .groupBy('d.supplier_id')
      .getRawMany();
    const payable = new Map(rows.map(r => [Number(r.supplierId), round2(Number(r.payable) || 0)]));

    return suppliers.map(s => ({
      id: s.id,
      name: s.name,
      phone: s.phone,
      note: s.note,
      payable: payable.get(s.id) ?? 0, // hozir shu yetkazib beruvchiga qarzimiz
    }));
  }

  async createSupplier(ownerId: number, actor: AuthUserPayload, dto: CreateSupplierDto) {
    const name = dto.name.trim();
    if (!name) throw new BadRequestException("Nom bo'sh bo'lmasligi kerak");
    if (await this.supplierRepo.exists({ where: { ownerId, name } })) {
      throw new BadRequestException(`"${name}" yetkazib beruvchisi allaqachon mavjud`);
    }
    const saved = await this.supplierRepo.save(
      this.supplierRepo.create({ ownerId, name, phone: dto.phone?.trim() || null, note: dto.note?.trim() || null }),
    );
    await this.audit(ownerId, actor, AuditAction.CREATE, 'Supplier', saved.id, name, `Yetkazib beruvchi qo'shildi: ${name}`);
    return saved;
  }

  async updateSupplier(id: number, ownerId: number, actor: AuthUserPayload, dto: UpdateSupplierDto) {
    const supplier = await this.findSupplier(id, ownerId);
    const before = { name: supplier.name, phone: supplier.phone, note: supplier.note };

    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (!name) throw new BadRequestException("Nom bo'sh bo'lmasligi kerak");
      if (name !== supplier.name && (await this.supplierRepo.exists({ where: { ownerId, name } }))) {
        throw new BadRequestException(`"${name}" yetkazib beruvchisi allaqachon mavjud`);
      }
      supplier.name = name;
    }
    if (dto.phone !== undefined) supplier.phone = dto.phone.trim() || null;
    if (dto.note !== undefined) supplier.note = dto.note.trim() || null;

    const saved = await this.supplierRepo.save(supplier);
    const changes = this.auditService.diff(before, { name: saved.name, phone: saved.phone, note: saved.note });
    if (changes) {
      await this.auditService.log({
        ownerId, userId: actor.id, userName: actor.username ?? null, action: AuditAction.UPDATE,
        entityType: 'Supplier', entityId: saved.id, entityLabel: saved.name, changes,
        description: `Yetkazib beruvchi yangilandi: ${saved.name}`,
      });
    }
    return saved;
  }

  async removeSupplier(id: number, ownerId: number, actor: AuthUserPayload) {
    const supplier = await this.findSupplier(id, ownerId);
    if (await this.supplierDebtRepo.exists({ where: { ownerId, supplier: { id } } })) {
      throw new BadRequestException("Bu yetkazib beruvchida qarz/xarid yozuvlari bor — o'chirib bo'lmaydi");
    }
    await this.supplierRepo.remove(supplier);
    await this.audit(ownerId, actor, AuditAction.DELETE, 'Supplier', id, supplier.name, `Yetkazib beruvchi o'chirildi: ${supplier.name}`);
    return { message: "Yetkazib beruvchi o'chirildi" };
  }

  private async findSupplier(id: number, ownerId: number) {
    const s = await this.supplierRepo.findOne({ where: { id, ownerId } });
    if (!s) throw new NotFoundException(`ID ${id} li yetkazib beruvchi topilmadi`);
    return s;
  }

  // ═══════════════════════════ YETKAZIB BERUVCHIGA QARZ (kreditorlik) ═══════════════════════════

  async createDebt(ownerId: number, actor: AuthUserPayload, dto: CreateSupplierDebtDto) {
    const supplier = await this.findSupplier(dto.supplierId, ownerId);
    const amount = round2(dto.amount);
    const paid = round2(dto.paidAmount ?? 0);
    if (paid > amount + 0.005) throw new BadRequestException("To'langan summa xarid summasidan katta bo'lmasligi kerak");

    const debtDate = dto.debtDate ?? todayStr();
    const remaining = round2(amount - paid);

    const saved = await this.supplierDebtRepo.manager.transaction(async manager => {
      const debt = await manager.save(
        SupplierDebt,
        manager.create(SupplierDebt, {
          ownerId,
          supplier,
          amount,
          paidAmount: paid,
          remainingAmount: remaining,
          debtDate,
          dueDate: dto.dueDate ?? null,
          status: remaining <= 0.005 ? DebtStatus.PAID : DebtStatus.OPEN,
          note: dto.note?.trim() || null,
          createdBy: actor.id,
        }),
      );

      if (paid > 0) {
        await manager.save(
          SupplierPayment,
          manager.create(SupplierPayment, {
            debt,
            ownerId,
            amount: paid,
            paymentType: dto.paymentType ?? 'cash',
            paymentDate: debtDate,
            note: 'Xarid paytida to\'landi',
            createdBy: actor.id,
          }),
        );
      }

      await this.auditService.log(
        {
          ownerId, userId: actor.id, userName: actor.username ?? null, action: AuditAction.CREATE,
          entityType: 'SupplierDebt', entityId: debt.id, entityLabel: supplier.name,
          description: `${supplier.name}dan ${amount} so'mlik xarid yozildi (to'langan: ${paid}, qarz: ${remaining})`,
        },
        manager,
      );
      return debt;
    });

    return this.getDebt(saved.id, ownerId);
  }

  async addPayment(debtId: number, ownerId: number, actor: AuthUserPayload, dto: AddSupplierPaymentDto) {
    await this.supplierDebtRepo.manager.transaction(async manager => {
      const debt = await manager.findOne(SupplierDebt, { where: { id: debtId, ownerId }, relations: ['supplier'] });
      if (!debt) throw new NotFoundException(`ID ${debtId} li qarz topilmadi`);
      if (debt.status !== DebtStatus.OPEN) {
        throw new BadRequestException(`Bu qarz ${debt.status} holatida — to'lov qo'shib bo'lmaydi`);
      }
      const amount = round2(dto.amount);
      if (amount > debt.remainingAmount + 0.05) {
        throw new BadRequestException(`To'lov summasi (${amount}) qolgan qarzdan (${debt.remainingAmount}) katta`);
      }

      await manager.save(
        SupplierPayment,
        manager.create(SupplierPayment, {
          debt,
          ownerId,
          amount,
          paymentType: dto.paymentType ?? 'cash',
          paymentDate: dto.paymentDate ?? todayStr(),
          note: dto.note?.trim() || null,
          createdBy: actor.id,
        }),
      );

      debt.paidAmount = round2(debt.paidAmount + amount);
      debt.remainingAmount = round2(debt.amount - debt.paidAmount);
      if (debt.remainingAmount <= 0.05) {
        debt.remainingAmount = 0;
        debt.status = DebtStatus.PAID;
      }
      await manager.save(SupplierDebt, debt);

      await this.auditService.log(
        {
          ownerId, userId: actor.id, userName: actor.username ?? null, action: AuditAction.PAYMENT,
          entityType: 'SupplierDebt', entityId: debt.id, entityLabel: debt.supplier.name,
          description: `${debt.supplier.name}ga ${amount} so'm to'landi (${dto.paymentType ?? 'cash'})`,
        },
        manager,
      );
    });
    return this.getDebt(debtId, ownerId);
  }

  async cancelDebt(id: number, ownerId: number, actor: AuthUserPayload) {
    const debt = await this.supplierDebtRepo.findOne({ where: { id, ownerId }, relations: ['supplier', 'payments'] });
    if (!debt) throw new NotFoundException(`ID ${id} li qarz topilmadi`);
    if (debt.status === DebtStatus.CANCELLED) throw new BadRequestException('Bu qarz allaqachon bekor qilingan');
    if ((debt.payments ?? []).length > 0) {
      throw new BadRequestException("Bu qarz bo'yicha to'lov qilingan — bekor qilib bo'lmaydi");
    }
    debt.status = DebtStatus.CANCELLED;
    debt.remainingAmount = 0;
    await this.supplierDebtRepo.save(debt);
    await this.audit(ownerId, actor, AuditAction.CANCEL, 'SupplierDebt', debt.id, debt.supplier.name, `${debt.supplier.name} xaridi bekor qilindi`);
    return { message: 'Qarz bekor qilindi' };
  }

  async getDebt(id: number, ownerId: number) {
    const debt = await this.supplierDebtRepo.findOne({
      where: { id, ownerId },
      relations: ['supplier', 'payments'],
    });
    if (!debt) throw new NotFoundException(`ID ${id} li qarz topilmadi`);
    return this.debtToResponse(debt);
  }

  async listDebts(
    ownerId: number,
    page: number = 1,
    limit: number = 20,
    filters: { status?: string; supplierId?: number } = {},
  ): Promise<PaginationResponse<any>> {
    const qb = this.supplierDebtRepo
      .createQueryBuilder('d')
      .leftJoinAndSelect('d.supplier', 's')
      .leftJoinAndSelect('d.payments', 'p')
      .where('d.ownerId = :ownerId', { ownerId });
    if (filters.status) qb.andWhere('d.status = :status', { status: filters.status });
    if (filters.supplierId) qb.andWhere('s.id = :supplierId', { supplierId: filters.supplierId });

    const [rows, total] = await qb
      .orderBy('d.debtDate', 'DESC')
      .addOrderBy('d.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data: rows.map(r => this.debtToResponse(r)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  private debtToResponse(d: SupplierDebt) {
    return {
      id: d.id,
      supplier: { id: d.supplier.id, name: d.supplier.name, phone: d.supplier.phone },
      amount: d.amount,
      paidAmount: d.paidAmount,
      remainingAmount: d.remainingAmount,
      debtDate: d.debtDate,
      dueDate: d.dueDate,
      status: d.status,
      note: d.note,
      createdAt: d.createdAt,
      payments: (d.payments ?? [])
        .slice()
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
        .map(p => ({
          id: p.id,
          amount: p.amount,
          paymentType: p.paymentType,
          paymentDate: p.paymentDate,
          note: p.note,
        })),
    };
  }

  // ═══════════════════════════ BOSHLANG'ICH QOLDIQ va PUL HARAKATI ═══════════════════════════

  async getOpening(ownerId: number) {
    return this.openingRepo.findOne({ where: { ownerId } });
  }

  async setOpening(ownerId: number, actor: AuthUserPayload, dto: SetOpeningDto) {
    const existing = await this.openingRepo.findOne({ where: { ownerId } });
    const before = existing
      ? { openingCash: existing.openingCash, openingBank: existing.openingBank, startDate: existing.startDate }
      : null;

    const entity = existing ?? this.openingRepo.create({ ownerId });
    entity.openingCash = round2(dto.openingCash);
    entity.openingBank = round2(dto.openingBank);
    entity.startDate = dto.startDate;
    entity.updatedBy = actor.id;
    const saved = await this.openingRepo.save(entity);

    await this.auditService.log({
      ownerId, userId: actor.id, userName: actor.username ?? null,
      action: existing ? AuditAction.UPDATE : AuditAction.CREATE,
      entityType: 'FinanceOpening', entityId: saved.id, entityLabel: 'Boshlang\'ich qoldiq',
      changes: before
        ? this.auditService.diff(before, { openingCash: saved.openingCash, openingBank: saved.openingBank, startDate: saved.startDate })
        : null,
      description: `Boshlang'ich qoldiq: naqd ${saved.openingCash}, bank ${saved.openingBank} (${saved.startDate} dan)`,
    });
    return saved;
  }

  async listAdjustments(ownerId: number, page: number = 1, limit: number = 20): Promise<PaginationResponse<CashAdjustment>> {
    const [data, total] = await this.adjustmentRepo.findAndCount({
      where: { ownerId },
      order: { adjustmentDate: 'DESC', id: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async createAdjustment(ownerId: number, actor: AuthUserPayload, dto: CreateAdjustmentDto) {
    if (!dto.amount) throw new BadRequestException("Summa 0 bo'lishi mumkin emas");
    const saved = await this.adjustmentRepo.save(
      this.adjustmentRepo.create({
        ownerId,
        account: dto.account,
        amount: round2(dto.amount),
        adjustmentDate: dto.adjustmentDate ?? todayStr(),
        note: dto.note?.trim() || null,
        createdBy: actor.id,
        createdByName: actor.username ?? null,
      }),
    );
    await this.audit(
      ownerId, actor, AuditAction.CREATE, 'CashAdjustment', saved.id,
      `${dto.account === 'cash' ? 'Naqd' : 'Bank'}: ${saved.amount}`,
      `Pul harakati (${dto.account === 'cash' ? 'naqd' : 'bank'}): ${saved.amount > 0 ? '+' : ''}${saved.amount} so'm${dto.note ? ' — ' + dto.note : ''}`,
    );
    return saved;
  }

  async removeAdjustment(id: number, ownerId: number, actor: AuthUserPayload) {
    const adj = await this.adjustmentRepo.findOne({ where: { id, ownerId } });
    if (!adj) throw new NotFoundException(`ID ${id} li yozuv topilmadi`);
    await this.adjustmentRepo.remove(adj);
    await this.audit(ownerId, actor, AuditAction.DELETE, 'CashAdjustment', id, `${adj.account}: ${adj.amount}`, `Pul harakati o'chirildi: ${adj.amount} so'm`);
    return { message: "Yozuv o'chirildi" };
  }

  // ═══════════════════════════ AYLANMA AKTIVLAR ═══════════════════════════

  /**
   * Do'konning aylanma aktivlari:
   *   • Mahsulot — ombordagi qoldiq TANNARX bo'yicha (costPrice: xarid + yetkazish + QQS)
   *   • Naqd pul va bank/karta — boshlang'ich qoldiq + undan keyingi pul harakati
   *   • Mijozlar qarzi (debitorlik) — bizga qarzdorlar
   * Majburiyat:
   *   • Yetkazib beruvchilarga qarz (kreditorlik) — biz qarzdormiz
   * Sof aktivlar = jami aktivlar − majburiyatlar.
   */
  async getAssets(ownerId: number) {
    const opening = await this.openingRepo.findOne({ where: { ownerId } });
    const startDate = opening?.startDate ?? null; // YYYY-MM-DD
    const fromTs = startDate ? new Date(`${startDate}T00:00:00`) : null;

    // ── 1) Mahsulot (tannarx bo'yicha) ──
    const inv = await this.batchRepo
      .createQueryBuilder('b')
      .innerJoin('b.product', 'p')
      .select(
        'COALESCE(SUM(b.remaining_quantity * CASE WHEN b.costPrice > 0 THEN b.costPrice ELSE b.purchase_price END), 0)',
        'cost',
      )
      .addSelect('COALESCE(SUM(b.remaining_quantity * b.selling_price), 0)', 'retail')
      .addSelect('COUNT(DISTINCT p.id)', 'products')
      .where('p.user_id = :ownerId', { ownerId })
      .andWhere('b.status != :depleted', { depleted: BatchStatus.DEPLETED })
      .getRawOne();

    // ── 2) Mijozlar qarzi (debitorlik) ──
    const rec = await this.debtRepo
      .createQueryBuilder('d')
      .select('COALESCE(SUM(d.remainingAmount), 0)', 'total')
      .addSelect('COUNT(DISTINCT d.customer_id)', 'customers')
      .where('d.ownerId = :ownerId', { ownerId })
      .andWhere('d.status = :status', { status: DebtStatus.OPEN })
      .getRawOne();

    // ── 3) Yetkazib beruvchilarga qarz (kreditorlik) ──
    const pay = await this.supplierDebtRepo
      .createQueryBuilder('d')
      .select('COALESCE(SUM(d.remainingAmount), 0)', 'total')
      .addSelect('COUNT(DISTINCT d.supplier_id)', 'suppliers')
      .where('d.ownerId = :ownerId', { ownerId })
      .andWhere('d.status = :status', { status: DebtStatus.OPEN })
      .getRawOne();

    // ── 4) Pul harakati (boshlang'ich qoldiqdan keyin) ──
    const cash = { salesIn: 0, debtPaymentsIn: 0, expensesOut: 0, suppliersOut: 0, returnsOut: 0, adjustments: 0 };
    const bank = { salesIn: 0, debtPaymentsIn: 0, expensesOut: 0, suppliersOut: 0, returnsOut: 0, adjustments: 0 };
    const acc = (type: string) => (bucketOf(type) === 'cash' ? cash : bank);

    // Savdodan tushgan pul (aralash to'lov — naqd va karta qismlarga bo'linadi)
    const salesQb = this.orderRepo
      .createQueryBuilder('o')
      .select('o.paymentType', 'type')
      .addSelect('SUM(o.paidAmount)', 'sum')
      .where('o.ownerId = :ownerId', { ownerId })
      .andWhere('o.status = :st', { st: OrderStatus.COMPLETED })
      .andWhere("o.paymentType != 'mixed'");
    if (fromTs) salesQb.andWhere('o.createdAt >= :from', { from: fromTs });
    for (const r of await salesQb.groupBy('o.paymentType').getRawMany()) {
      acc(r.type).salesIn += Number(r.sum) || 0;
    }

    const mixedQb = this.orderRepo
      .createQueryBuilder('o')
      .select(['o.id', 'o.paidAmount', 'o.paymentBreakdown'])
      .where('o.ownerId = :ownerId', { ownerId })
      .andWhere('o.status = :st', { st: OrderStatus.COMPLETED })
      .andWhere("o.paymentType = 'mixed'");
    if (fromTs) mixedQb.andWhere('o.createdAt >= :from', { from: fromTs });
    for (const o of await mixedQb.getMany()) {
      if (Array.isArray(o.paymentBreakdown) && o.paymentBreakdown.length) {
        for (const part of o.paymentBreakdown) acc(part.type).salesIn += Number(part.amount) || 0;
      } else {
        cash.salesIn += Number(o.paidAmount) || 0;
      }
    }

    // Mijozlar qarzi bo'yicha qabul qilingan to'lovlar
    const dpQb = this.debtPaymentRepo
      .createQueryBuilder('p')
      .innerJoin('p.debt', 'd')
      .select('p.paymentType', 'type')
      .addSelect('SUM(p.amount)', 'sum')
      .where('d.ownerId = :ownerId', { ownerId });
    if (fromTs) dpQb.andWhere('p.createdAt >= :from', { from: fromTs });
    for (const r of await dpQb.groupBy('p.paymentType').getRawMany()) {
      acc(r.type).debtPaymentsIn += Number(r.sum) || 0;
    }

    // Qaytarishlarda mijozga naqd qaytarilgan pul (qarzga ayirilgani pul chiqimi emas)
    const retQb = this.returnRepo
      .createQueryBuilder('r')
      .select('COALESCE(SUM(r.totalRefundAmount - r.appliedToDebt), 0)', 'sum')
      .where('r.ownerId = :ownerId', { ownerId });
    if (fromTs) retQb.andWhere('r.createdAt >= :from', { from: fromTs });
    cash.returnsOut += Number((await retQb.getRawOne()).sum) || 0;

    // Xarajatlar
    const expQb = this.expenseRepo
      .createQueryBuilder('e')
      .select('e.paymentType', 'type')
      .addSelect('SUM(e.amount)', 'sum')
      .where('e.ownerId = :ownerId', { ownerId });
    if (startDate) expQb.andWhere('e.expenseDate >= :startDate', { startDate });
    for (const r of await expQb.groupBy('e.paymentType').getRawMany()) {
      acc(r.type).expensesOut += Number(r.sum) || 0;
    }

    // Yetkazib beruvchilarga to'lovlar
    const spQb = this.supplierPaymentRepo
      .createQueryBuilder('p')
      .select('p.paymentType', 'type')
      .addSelect('SUM(p.amount)', 'sum')
      .where('p.ownerId = :ownerId', { ownerId });
    if (startDate) spQb.andWhere('p.paymentDate >= :startDate', { startDate });
    for (const r of await spQb.groupBy('p.paymentType').getRawMany()) {
      acc(r.type).suppliersOut += Number(r.sum) || 0;
    }

    // Qo'lda kiritilgan pul harakati
    const adjQb = this.adjustmentRepo
      .createQueryBuilder('a')
      .select('a.account', 'account')
      .addSelect('SUM(a.amount)', 'sum')
      .where('a.ownerId = :ownerId', { ownerId });
    if (startDate) adjQb.andWhere('a.adjustmentDate >= :startDate', { startDate });
    for (const r of await adjQb.groupBy('a.account').getRawMany()) {
      (r.account === 'cash' ? cash : bank).adjustments += Number(r.sum) || 0;
    }

    const balance = (openingValue: number, b: typeof cash) =>
      round2(openingValue + b.salesIn + b.debtPaymentsIn + b.adjustments - b.expensesOut - b.suppliersOut - b.returnsOut);

    const openingCash = opening?.openingCash ?? 0;
    const openingBank = opening?.openingBank ?? 0;
    const cashBalance = balance(openingCash, cash);
    const bankBalance = balance(openingBank, bank);

    const inventoryCost = round2(Number(inv.cost) || 0);
    const receivables = round2(Number(rec.total) || 0);
    const payables = round2(Number(pay.total) || 0);
    const totalCurrentAssets = round2(inventoryCost + cashBalance + bankBalance + receivables);

    const rounded = (b: typeof cash) => ({
      salesIn: round2(b.salesIn),
      debtPaymentsIn: round2(b.debtPaymentsIn),
      adjustments: round2(b.adjustments),
      expensesOut: round2(b.expensesOut),
      suppliersOut: round2(b.suppliersOut),
      returnsOut: round2(b.returnsOut),
    });

    return {
      asOf: new Date().toISOString(),
      // Boshlang'ich qoldiq kiritilmagan bo'lsa pul qoldig'i ishonchsiz (0 dan hisoblanadi)
      opening: opening
        ? { openingCash, openingBank, startDate: opening.startDate }
        : null,
      assets: {
        inventory: {
          cost: inventoryCost, // tannarx bo'yicha
          retail: round2(Number(inv.retail) || 0), // sotuv narxi bo'yicha (ma'lumot uchun)
          products: Number(inv.products) || 0,
        },
        cash: { balance: cashBalance, opening: openingCash, ...rounded(cash) },
        bank: { balance: bankBalance, opening: openingBank, ...rounded(bank) },
        money: round2(cashBalance + bankBalance),
        receivables: { total: receivables, customers: Number(rec.customers) || 0 },
        totalCurrent: totalCurrentAssets,
      },
      liabilities: {
        payables: { total: payables, suppliers: Number(pay.suppliers) || 0 },
        total: payables,
      },
      netAssets: round2(totalCurrentAssets - payables),
    };
  }

  private async audit(
    ownerId: number, actor: AuthUserPayload, action: AuditAction,
    entityType: string, entityId: number, label: string, description: string,
  ) {
    await this.auditService.log({
      ownerId, userId: actor.id, userName: actor.username ?? null, action,
      entityType, entityId, entityLabel: label, description,
    });
  }
}
