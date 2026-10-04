import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { AuditLog, AuditAction } from './entities/audit-log.entity';
import { PaginationResponse } from 'common/interface/pagination.interface';

export interface AuditLogParams {
  ownerId: number;
  userId: number;
  userName?: string | null;
  action: AuditAction;
  entityType: string;
  entityId?: number | null;
  entityLabel?: string | null;
  changes?: Record<string, { old: any; new: any }> | null;
  description?: string | null;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog) private readonly auditRepository: Repository<AuditLog>,
  ) {}

  /**
   * `manager` berilsa — mavjud tranzaksiyaning ichida yoziladi (masalan
   * chekni bekor qilish yoki qaytarish bilan BIR XIL tranzaksiyada), shu
   * orqali asosiy amal va uning audit yozuvi birga saqlanadi yoki birga
   * bekor bo'ladi.
   */
  async log(params: AuditLogParams, manager?: EntityManager): Promise<void> {
    const repo = manager ? manager.getRepository(AuditLog) : this.auditRepository;
    const entry = repo.create({
      ownerId: params.ownerId,
      userId: params.userId,
      userName: params.userName ?? null,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId ?? null,
      entityLabel: params.entityLabel ?? null,
      changes: params.changes ?? null,
      description: params.description ?? null,
    });
    await repo.save(entry);
  }

  /**
   * Ikki obyektni solishtirib, o'zgargan maydonlarnigina qaytaradi.
   * `fields` berilmasa, ikkala obyektda ham mavjud barcha kalitlar
   * tekshiriladi.
   */
  diff(before: Record<string, any>, after: Record<string, any>, fields?: string[]) {
    const keys = fields ?? Array.from(new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]));
    const changes: Record<string, { old: any; new: any }> = {};

    for (const key of keys) {
      const oldVal = before?.[key];
      const newVal = after?.[key];
      // Decimal/number solishtirishda tip farqini e'tiborsiz qoldiramiz
      const normalize = (v: any) => (typeof v === 'number' || typeof v === 'string' ? String(v) : v);
      if (JSON.stringify(normalize(oldVal)) !== JSON.stringify(normalize(newVal))) {
        changes[key] = { old: oldVal ?? null, new: newVal ?? null };
      }
    }

    return Object.keys(changes).length ? changes : null;
  }

  async findAll(
    ownerId: number,
    page: number = 1,
    limit: number = 30,
    filters?: { entityType?: string; action?: string; userId?: number; dateFrom?: string; dateTo?: string },
  ): Promise<PaginationResponse<AuditLog>> {
    const skip = (page - 1) * limit;
    const qb = this.auditRepository
      .createQueryBuilder('a')
      .where('a.owner_id = :ownerId', { ownerId });

    if (filters?.entityType) qb.andWhere('a.entityType = :entityType', { entityType: filters.entityType });
    if (filters?.action) qb.andWhere('a.action = :action', { action: filters.action });
    if (filters?.userId) qb.andWhere('a.userId = :userId', { userId: filters.userId });
    if (filters?.dateFrom) qb.andWhere('a.createdAt >= :dateFrom', { dateFrom: filters.dateFrom });
    if (filters?.dateTo) qb.andWhere('a.createdAt <= :dateTo', { dateTo: filters.dateTo });

    const [data, total] = await qb
      .orderBy('a.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }
}
