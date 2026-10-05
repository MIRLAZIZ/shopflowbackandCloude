import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { InventorySession } from './entities/inventory-session.entity';
import { InventoryCountItem } from './entities/inventory-count-item.entity';
import { Product } from 'src/products/entities/product.entity';
import { ProductBatch } from 'src/products/entities/product-batch.entity';
import { BatchStatus } from 'common/enums/batch-status.enum';
import { InventoryStatus } from 'common/enums/inventory-status.enum';
import { RecordCountDto } from './dto/inventory.dto';
import { PaginationResponse } from 'common/interface/pagination.interface';
import { AuditService } from 'src/audit/audit.service';
import { AuditAction } from 'src/audit/entities/audit-log.entity';

const round3 = (v: number) => Math.round(v * 1000) / 1000;

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(InventorySession) private readonly sessionRepository: Repository<InventorySession>,
    @InjectRepository(InventoryCountItem) private readonly itemRepository: Repository<InventoryCountItem>,
    private readonly auditService: AuditService,
  ) {}

  async startSession(ownerId: number, userId: number, note?: string) {
    return this.sessionRepository.manager.transaction(async manager => {
      const session = manager.create(InventorySession, {
        ownerId,
        startedBy: userId,
        status: InventoryStatus.OPEN,
        note: note || null,
      });
      await manager.save(InventorySession, session);

      // Hali tugamagan (depleted bo'lmagan) barcha partiyalarni
      // sessiyaga joriy qoldiq bilan "snapshot" sifatida qo'shamiz
      const batches = await manager.find(ProductBatch, {
        where: { product: { user: { id: ownerId } }, status: Not(BatchStatus.DEPLETED) },
        relations: ['product'],
      });

      const items = batches.map(batch =>
        manager.create(InventoryCountItem, {
          session,
          product: batch.product,
          productBatch: batch,
          systemQuantity: batch.remaining_quantity,
          countedQuantity: null,
          difference: null,
        }),
      );
      await manager.save(InventoryCountItem, items);

      return this.getSession(session.id, ownerId, manager);
    });
  }

  async recordCount(sessionId: number, ownerId: number, dto: RecordCountDto, userId: number) {
    const session = await this.sessionRepository.findOne({ where: { id: sessionId, ownerId } });
    if (!session) throw new NotFoundException('Inventarizatsiya sessiyasi topilmadi');
    if (session.status !== InventoryStatus.OPEN) {
      throw new BadRequestException(`Bu sessiya ${session.status} holatida — hisoblash mumkin emas`);
    }

    const item = await this.itemRepository.findOne({
      where: { session: { id: sessionId }, productBatch: { id: dto.batchId } },
      relations: ['product', 'productBatch'],
    });
    if (!item) throw new NotFoundException("Bu partiya sessiyada topilmadi");

    item.countedQuantity = round3(dto.countedQuantity);
    item.difference = round3(item.countedQuantity - item.systemQuantity);
    item.countedBy = userId;
    item.countedAt = new Date();
    await this.itemRepository.save(item);

    return {
      id: item.id,
      productId: item.product.id,
      productName: item.product.name,
      batchId: item.productBatch.id,
      systemQuantity: item.systemQuantity,
      countedQuantity: item.countedQuantity,
      difference: item.difference,
    };
  }

  async getSession(sessionId: number, ownerId: number, manager = this.sessionRepository.manager) {
    const session = await manager.findOne(InventorySession, {
      where: { id: sessionId, ownerId },
      relations: ['items', 'items.product', 'items.productBatch'],
    });
    if (!session) throw new NotFoundException('Inventarizatsiya sessiyasi topilmadi');

    const items = (session.items ?? []).map(item => ({
      id: item.id,
      productId: item.product.id,
      productName: item.product.name,
      batchId: item.productBatch.id,
      systemQuantity: item.systemQuantity,
      countedQuantity: item.countedQuantity,
      difference: item.difference,
      countedAt: item.countedAt,
      purchasePrice: item.productBatch.purchase_price,
    }));

    const counted = items.filter(i => i.countedQuantity !== null);
    const withDiff = counted.filter(i => (i.difference ?? 0) !== 0);
    const surplus = withDiff.filter(i => (i.difference ?? 0) > 0);
    const shortage = withDiff.filter(i => (i.difference ?? 0) < 0);

    const summary = {
      totalItems: items.length,
      countedItems: counted.length,
      pendingItems: items.length - counted.length,
      itemsWithDifference: withDiff.length,
      surplusQuantity: round3(surplus.reduce((s, i) => s + (i.difference ?? 0), 0)),
      shortageQuantity: round3(shortage.reduce((s, i) => s + Math.abs(i.difference ?? 0), 0)),
      // Kamomad qiymati — tannarx (purchase_price) bo'yicha, haqiqiy yo'qotishni ko'rsatadi
      shortageValue: round3(shortage.reduce((s, i) => s + Math.abs(i.difference ?? 0) * i.purchasePrice, 0)),
      surplusValue: round3(surplus.reduce((s, i) => s + (i.difference ?? 0) * i.purchasePrice, 0)),
    };

    return {
      id: session.id,
      status: session.status,
      startedBy: session.startedBy,
      completedBy: session.completedBy,
      completedAt: session.completedAt,
      note: session.note,
      createdAt: session.createdAt,
      items,
      summary,
    };
  }

  async listSessions(ownerId: number, page: number = 1, limit: number = 20): Promise<PaginationResponse<any>> {
    const skip = (page - 1) * limit;
    const [sessions, total] = await this.sessionRepository.findAndCount({
      where: { ownerId },
      relations: ['items'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return {
      data: sessions.map(s => ({
        id: s.id,
        status: s.status,
        note: s.note,
        createdAt: s.createdAt,
        completedAt: s.completedAt,
        totalItems: s.items?.length ?? 0,
        countedItems: s.items?.filter(i => i.countedQuantity !== null).length ?? 0,
      })),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async completeSession(sessionId: number, ownerId: number, userId: number, note?: string) {
    return this.sessionRepository.manager.transaction(async manager => {
      const session = await manager.findOne(InventorySession, {
        where: { id: sessionId, ownerId },
        relations: ['items', 'items.product', 'items.productBatch'],
      });
      if (!session) throw new NotFoundException('Inventarizatsiya sessiyasi topilmadi');
      if (session.status !== InventoryStatus.OPEN) {
        throw new BadRequestException(`Bu sessiya allaqachon ${session.status} holatida`);
      }

      const productUpdates = new Map<number, Product>();
      let adjustedCount = 0;

      for (const item of session.items) {
        if (item.countedQuantity === null) continue; // sanalmagan — tegilmaydi

        // ⚠️ Hisoblash paytida sotuv bo'lgan bo'lishi mumkin — shuning
        // uchun snapshot (systemQuantity) emas, PARTIYANING HOZIRGI
        // qoldig'i bilan solishtirib delta hisoblanadi, bu to'g'riroq.
        const batch = await manager.findOneOrFail(ProductBatch, { where: { id: item.productBatch.id } });
        const currentRemaining = batch.remaining_quantity;
        const delta = round3(item.countedQuantity - currentRemaining);

        if (delta === 0) continue;

        batch.remaining_quantity = item.countedQuantity;
        if (item.countedQuantity <= 0 && batch.status === BatchStatus.ACTIVE) {
          batch.status = BatchStatus.DEPLETED;
          batch.depleted_at = new Date();
        } else if (item.countedQuantity > 0 && batch.status === BatchStatus.DEPLETED) {
          // Sanashda topilgan bo'lsa — qayta aktivlashtiramiz
          batch.status = BatchStatus.ACTIVE;
          batch.depleted_at = null as any;
        }
        await manager.save(ProductBatch, batch);

        const product = productUpdates.get(item.product.id)
          ?? (await manager.findOneOrFail(Product, { where: { id: item.product.id } }));
        product.quantity = round3(product.quantity + delta);
        productUpdates.set(product.id, product);

        await this.auditService.log(
          {
            ownerId,
            userId,
            action: AuditAction.UPDATE,
            entityType: 'ProductBatch',
            entityId: batch.id,
            entityLabel: item.product.name,
            changes: { remaining_quantity: { old: currentRemaining, new: item.countedQuantity } },
            description: `Inventarizatsiya: "${item.product.name}" qoldig'i ${currentRemaining} dan ${item.countedQuantity} ga to'g'rilandi (sessiya #${session.id})`,
          },
          manager,
        );

        adjustedCount++;
      }

      await manager.save(Product, [...productUpdates.values()]);

      session.status = InventoryStatus.COMPLETED;
      session.completedBy = userId;
      session.completedAt = new Date();
      if (note) session.note = note;
      await manager.save(InventorySession, session);

      return {
        message: `Inventarizatsiya yakunlandi — ${adjustedCount} ta partiya qoldig'i to'g'rilandi`,
        adjustedCount,
        session: await this.getSession(sessionId, ownerId, manager),
      };
    });
  }

  async cancelSession(sessionId: number, ownerId: number) {
    const session = await this.sessionRepository.findOne({ where: { id: sessionId, ownerId } });
    if (!session) throw new NotFoundException('Inventarizatsiya sessiyasi topilmadi');
    if (session.status !== InventoryStatus.OPEN) {
      throw new BadRequestException(`Bu sessiya allaqachon ${session.status} holatida`);
    }
    session.status = InventoryStatus.CANCELLED;
    await this.sessionRepository.save(session);
    return { message: 'Inventarizatsiya bekor qilindi' };
  }
}
