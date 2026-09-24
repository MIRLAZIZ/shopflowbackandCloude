import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Not } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { OrderReturn } from './entities/order-return.entity';
import { OrderReturnItem } from './entities/order-return-item.entity';
import { Product } from 'src/products/entities/product.entity';
import { ProductBatch } from 'src/products/entities/product-batch.entity';
import { StatisticsService } from 'src/statistics/statistics.service';
import { DebtsService } from 'src/debts/debts.service';
import { OrderStatus } from 'common/enums/order-status.enum';
import { PaymentType } from 'common/enums/paymentType.enum';
import { PaginationResponse } from 'common/interface/pagination.interface';
import { OrderSearchParams } from 'common/interface/order-search';
import { ReducedInterface } from 'common/interface/reduced.interface';
import { AuthUserPayload, getOwnerId } from 'common/utils/owner.util';
import { CreateOrderDto } from './dto/create-order.dto';
import { CreateReturnDto } from './dto/create-return.dto';

const round2 = (value: number): number => Math.round(value * 100) / 100;

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order) private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderReturn) private readonly orderReturnRepository: Repository<OrderReturn>,
    private readonly statisticsService: StatisticsService,
    private readonly debtsService: DebtsService,
    @InjectQueue('sales-queue') private readonly saleQueue: Queue,
  ) {}

  async create(dto: CreateOrderDto, authUser: AuthUserPayload) {
    const ownerId = getOwnerId(authUser);
    const userId = authUser.id; // chekni bevosita amalga oshirgan xodim

    // 🔥 Dublikat mahsulot tekshiruvi
    const productIds = dto.items.map((i) => i.product_id);
    if (new Set(productIds).size !== productIds.length) {
      throw new BadRequestException(
        'Bir xil mahsulotni bir chekda 2 marta ko\'rsatib bo\'lmaydi — miqdorni bittasiga yig\'ing',
      );
    }

    const reducedProducts: ReducedInterface[] = [];

    const savedOrder = await this.orderRepository.manager.transaction(async (manager) => {
      // 🔍 Mahsulotlarni do'kon egasi bo'yicha olish (kassir ham shu ro'yxatdan foydalanadi)
      const products = await manager.find(Product, {
        where: { id: In(productIds), user: { id: ownerId } },
        relations: ['user'],
      });
      const productMap = new Map(products.map((p) => [p.id, p]));

      const items: OrderItem[] = [];
      const updatedBatches = new Map<number, ProductBatch>();
      let subtotal = 0;
      let totalDiscount = 0;

      for (const line of dto.items) {
        const product = productMap.get(line.product_id);
        if (!product) {
          throw new NotFoundException(`ID ${line.product_id} li mahsulot topilmadi`);
        }

        // 🔒 FIFO — eng eski partiyadan boshlab, lock bilan
        const batches = await manager.find(ProductBatch, {
          where: { product: { id: line.product_id }, remaining_quantity: Not(0) },
          order: { createdAt: 'ASC' },
          lock: { mode: 'pessimistic_write' },
        });

        if (!batches.length) {
          throw new BadRequestException(`${product.name} uchun mahsulot qolmagan`);
        }

        let required = line.quantity;
        const lineDiscount = line.discount ?? 0;
        let discountLeft = lineDiscount;

        for (const batch of batches) {
          if (required <= 0) break;

          const take = Math.min(batch.remaining_quantity, required);
          // Chegirmani shu partiyadan olingan miqdorga proporsional taqsimlaymiz
          const portion = lineDiscount > 0 ? round2((lineDiscount * take) / line.quantity) : 0;
          discountLeft -= portion;

          const item = manager.create(OrderItem, {
            product,
            productBatch: { id: batch.id } as ProductBatch,
            quantity: take,
            selling_price: batch.selling_price,
            purchase_price: batch.purchase_price,
            discount: portion,
            total: round2(batch.selling_price * take - portion),
          });
          items.push(item);

          subtotal += batch.selling_price * take;
          totalDiscount += portion;

          batch.remaining_quantity -= take;
          if (batch.remaining_quantity === 0) {
            batch.depleted_at = new Date();
          }
          updatedBatches.set(batch.id, batch);

          required -= take;
        }

        if (required > 0) {
          throw new BadRequestException(`${product.name} mahsuloti yetarli emas`);
        }

        product.quantity -= line.quantity;
        if (product.quantity <= product.max_quantity_notification) {
          reducedProducts.push({
            id: product.id,
            name: product.name,
            quantity: product.quantity,
            telegramGroupId: product.user.telegramGroupId,
          });
        }
      }

      subtotal = round2(subtotal);
      totalDiscount = round2(totalDiscount);
      const total = round2(subtotal - totalDiscount);

      // 💳 To'lov: paidAmount berilmasa — chek to'liq to'langan deb olinadi
      let paidAmount = dto.paidAmount != null ? round2(dto.paidAmount) : total;
      if (paidAmount > total) paidAmount = total; // ortiqcha — qaytim, bu yerda saqlanmaydi
      if (paidAmount < 0) paidAmount = 0;
      const debtAmount = round2(total - paidAmount);

      if (debtAmount > 0 && !dto.customerId) {
        throw new BadRequestException(
          "Chek to'liq to'lanmadi — qarz sifatida yozish uchun mijoz tanlanishi shart (customerId)",
        );
      }

      if (dto.paymentType === PaymentType.Mixed) {
        if (!dto.payments?.length) {
          throw new BadRequestException(
            "Aralash to'lov uchun 'payments' ro'yxati (har bir usul bo'yicha summa) kerak",
          );
        }
        const sum = round2(dto.payments.reduce((s, p) => s + p.amount, 0));
        if (Math.abs(sum - paidAmount) > 0.05) {
          throw new BadRequestException(
            `To'lov usullari yig'indisi (${sum}) to'langan summaga (${paidAmount}) teng emas`,
          );
        }
      }

      const order = manager.create(Order, {
        ownerId,
        user: { id: userId } as any,
        items,
        subtotal,
        discount: totalDiscount,
        total,
        paidAmount,
        debtAmount,
        paymentType: dto.paymentType,
        paymentBreakdown:
          dto.paymentType === PaymentType.Mixed
            ? dto.payments!.map((p) => ({ type: p.type, amount: round2(p.amount) }))
            : null,
        customerId: dto.customerId ?? null,
        status: OrderStatus.COMPLETED,
      });

      const saved = await manager.save(Order, order);

      // 💰 Qarzdorlar moduli — chek to'liq to'lanmagan bo'lsa, shu
      // tranzaksiyaning o'zida Debt yozuvi ham yaratiladi
      if (debtAmount > 0 && dto.customerId) {
        await this.debtsService.createFromOrder(manager, {
          ownerId,
          orderId: saved.id,
          customerId: dto.customerId,
          amount: debtAmount,
        });
      }

      await manager.save(Product, [...productMap.values()]);
      await manager.save(ProductBatch, [...updatedBatches.values()]);

      // 📊 Statistika do'kon egasi bo'yicha yuritiladi (kim sotgani muhim emas)
      for (const item of items) {
        await this.statisticsService.createOrUpdate(manager, {
          userId: ownerId,
          productId: item.product.id,
          quantity: item.quantity,
          totalSales: item.selling_price * item.quantity,
          discount: item.discount,
          profit: (item.selling_price - item.purchase_price) * item.quantity,
        });
      }

      return saved;
    });

    if (reducedProducts.length > 0) {
      await this.saleQueue.add('sale-created', reducedProducts);
    }

    return this.findOne(savedOrder.id, authUser);
  }

  async findAll(
    authUser: AuthUserPayload,
    page: number = 1,
    limit: number = 12,
  ): Promise<PaginationResponse<any>> {
    const ownerId = getOwnerId(authUser);
    const skip = (page - 1) * limit;

    const [orders, total] = await this.orderRepository.findAndCount({
      where: { ownerId },
      relations: ['items', 'items.product', 'user'],
      order: { id: 'DESC' },
      skip,
      take: limit,
    });

    return {
      data: orders.map((o) => this.toResponse(o)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number, authUser: AuthUserPayload) {
    const ownerId = getOwnerId(authUser);
    const order = await this.orderRepository.findOne({
      where: { id, ownerId },
      relations: ['items', 'items.product', 'user'],
    });

    if (!order) {
      throw new NotFoundException(`ID ${id} li chek topilmadi`);
    }

    return this.toResponse(order);
  }

  async cancel(id: number, authUser: AuthUserPayload, reason?: string) {
    const ownerId = getOwnerId(authUser);

    return this.orderRepository.manager.transaction(async (manager) => {
      const order = await manager.findOne(Order, {
        where: { id, ownerId },
        relations: ['items', 'items.product', 'items.productBatch'],
      });

      if (!order) {
        throw new NotFoundException(`ID ${id} li chek topilmadi`);
      }

      if (order.status !== OrderStatus.COMPLETED) {
        throw new BadRequestException(`Bu chek allaqachon ${order.status} holatida`);
      }

      // Har bir qator uchun mahsulot va partiya miqdorini qaytarish
      const productUpdates = new Map<number, Product>();
      const batchUpdates = new Map<number, ProductBatch>();

      for (const item of order.items) {
        const product =
          productUpdates.get(item.product.id) ??
          (await manager.findOneOrFail(Product, { where: { id: item.product.id } }));
        product.quantity += item.quantity;
        productUpdates.set(product.id, product);

        const batch = await manager.findOne(ProductBatch, {
          where: { id: item.productBatch.id },
        });
        if (batch) {
          batch.remaining_quantity += item.quantity;
          batch.depleted_at = null as any;
          batchUpdates.set(batch.id, batch);
        }
      }

      await manager.save(Product, [...productUpdates.values()]);
      await manager.save(ProductBatch, [...batchUpdates.values()]);

      // 💰 Agar shu chekka bog'liq qarz bo'lsa — uni ham bekor qiladi
      // (to'lov qilingan bo'lsa xato tashlaydi, qo'lda hal qilish talab etiladi)
      await this.debtsService.cancelForOrder(manager, order.id);

      order.status = OrderStatus.CANCELLED;
      order.cancelledReason = reason || null;
      order.cancelledAt = new Date();
      order.cancelledBy = authUser.id;
      await manager.save(Order, order);

      return {
        message: 'Chek bekor qilindi va mahsulotlar omborga qaytarildi',
        order: this.toResponse(order),
      };
    });
  }

  /**
   * ↩️ Qisman yoki to'liq qaytarish. `cancel()`dan farqi: butun chekni
   * bekor qilmaydi, faqat ko'rsatilgan qatorlardan ko'rsatilgan miqdorni
   * qaytaradi — qolgan mahsulotlar chekda tegishlicha qolaveradi.
   */
  async createReturn(orderId: number, dto: CreateReturnDto, authUser: AuthUserPayload) {
    const ownerId = getOwnerId(authUser);

    return this.orderRepository.manager.transaction(async (manager) => {
      const order = await manager.findOne(Order, {
        where: { id: orderId, ownerId },
        relations: ['items', 'items.product', 'items.productBatch'],
      });

      if (!order) {
        throw new NotFoundException(`ID ${orderId} li chek topilmadi`);
      }
      if (order.status !== OrderStatus.COMPLETED) {
        throw new BadRequestException(
          `Bu chek ${order.status} holatida — qaytarish faqat yakunlangan cheklar uchun`,
        );
      }

      const returnItems: OrderReturnItem[] = [];
      const productUpdates = new Map<number, Product>();
      const batchUpdates = new Map<number, ProductBatch>();
      let totalRefund = 0;

      for (const line of dto.items) {
        const item = order.items.find((i) => i.id === line.orderItemId);
        if (!item) {
          throw new NotFoundException(
            `ID ${line.orderItemId} li chek qatori shu chekka tegishli emas`,
          );
        }

        const alreadyReturned = item.returnedQuantity ?? 0;
        const returnable = round2(item.quantity - alreadyReturned);
        if (line.quantity > returnable + 0.001) {
          throw new BadRequestException(
            `${item.product.name}: ${line.quantity} ta qaytarib bo'lmaydi — faqat ${returnable} ta qaytarish mumkin`,
          );
        }

        // Chegirmadan keyingi haqiqiy birlik narxi bo'yicha qaytim hisoblanadi
        const unitEffectivePrice = item.total / item.quantity;
        const refundAmount = round2(unitEffectivePrice * line.quantity);
        totalRefund += refundAmount;

        item.returnedQuantity = round2(alreadyReturned + line.quantity);
        await manager.save(OrderItem, item);

        // 📦 Ombor: mahsulot va partiya miqdorini qaytaramiz
        const product =
          productUpdates.get(item.product.id) ??
          (await manager.findOneOrFail(Product, { where: { id: item.product.id } }));
        product.quantity += line.quantity;
        productUpdates.set(product.id, product);

        const batch =
          batchUpdates.get(item.productBatch.id) ??
          (await manager.findOne(ProductBatch, { where: { id: item.productBatch.id } }));
        if (batch) {
          batch.remaining_quantity += line.quantity;
          batch.depleted_at = null as any;
          batchUpdates.set(batch.id, batch);
        }

        returnItems.push(
          manager.create(OrderReturnItem, {
            orderItem: item,
            product: item.product,
            quantity: line.quantity,
            refundAmount,
          }),
        );
      }

      totalRefund = round2(totalRefund);

      await manager.save(Product, [...productUpdates.values()]);
      await manager.save(ProductBatch, [...batchUpdates.values()]);

      // 💰 Agar shu chekka bog'liq ochiq qarz bo'lsa — qaytarilgan summaga
      // qarz kamaytiriladi, qolgani mijozga naqd/karta qaytariladi
      const appliedToDebt = await this.debtsService.reduceForReturn(manager, order.id, totalRefund);

      const orderReturn = manager.create(OrderReturn, {
        ownerId,
        order,
        user: { id: authUser.id } as any,
        items: returnItems,
        totalRefundAmount: totalRefund,
        appliedToDebt,
        reason: dto.reason?.trim() || null,
      });
      const savedReturn = await manager.save(OrderReturn, orderReturn);

      return {
        id: savedReturn.id,
        orderId: order.id,
        totalRefundAmount: totalRefund,
        appliedToDebt,
        cashRefundAmount: round2(totalRefund - appliedToDebt),
        reason: savedReturn.reason,
        createdAt: savedReturn.createdAt,
        items: returnItems.map((i) => ({
          productId: i.product.id,
          productName: (i.product as any).name,
          quantity: i.quantity,
          refundAmount: i.refundAmount,
        })),
      };
    });
  }

  async getReturns(authUser: AuthUserPayload, page: number = 1, limit: number = 20) {
    const ownerId = getOwnerId(authUser);
    const skip = (page - 1) * limit;

    const [returns, total] = await this.orderReturnRepository.findAndCount({
      where: { ownerId },
      relations: ['items', 'items.product', 'order', 'user'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return {
      data: returns.map((r) => ({
        id: r.id,
        orderId: r.order?.id,
        totalRefundAmount: r.totalRefundAmount,
        appliedToDebt: r.appliedToDebt,
        cashRefundAmount: round2(r.totalRefundAmount - r.appliedToDebt),
        reason: r.reason,
        createdAt: r.createdAt,
        user: r.user && { id: r.user.id, name: r.user.fullName },
        items: (r.items ?? []).map((i) => ({
          productId: i.product?.id,
          productName: (i.product as any)?.name,
          quantity: i.quantity,
          refundAmount: i.refundAmount,
        })),
      })),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getOrderReturns(orderId: number, authUser: AuthUserPayload) {
    const ownerId = getOwnerId(authUser);
    const returns = await this.orderReturnRepository.find({
      where: { ownerId, order: { id: orderId } },
      relations: ['items', 'items.product', 'user'],
      order: { createdAt: 'DESC' },
    });

    return returns.map((r) => ({
      id: r.id,
      totalRefundAmount: r.totalRefundAmount,
      appliedToDebt: r.appliedToDebt,
      cashRefundAmount: round2(r.totalRefundAmount - r.appliedToDebt),
      reason: r.reason,
      createdAt: r.createdAt,
      items: (r.items ?? []).map((i) => ({
        productId: i.product?.id,
        productName: (i.product as any)?.name,
        quantity: i.quantity,
        refundAmount: i.refundAmount,
      })),
    }));
  }

  async search(
    authUser: AuthUserPayload,
    params: OrderSearchParams,
    page: number = 1,
    limit: number = 12,
  ) {
    const ownerId = getOwnerId(authUser);
    const skip = (page - 1) * limit;

    const qb = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'items')
      .leftJoinAndSelect('items.product', 'product')
      .leftJoinAndSelect('order.user', 'user')
      .where('order.owner_id = :ownerId', { ownerId });

    if (params.orderId != null) {
      qb.andWhere('order.id = :orderId', { orderId: params.orderId });
    }

    if (params.productName?.trim()) {
      qb.andWhere('LOWER(product.name) LIKE LOWER(:productName)', {
        productName: `%${params.productName.trim()}%`,
      });
    }

    if (params.paymentType) {
      qb.andWhere('order.paymentType = :paymentType', { paymentType: params.paymentType });
    }

    if (params.status) {
      qb.andWhere('order.status = :status', { status: params.status });
    }

    if (params.date) {
      qb.andWhere('DATE(order.createdAt) = DATE(:date)', { date: params.date });
    }

    qb.orderBy('order.createdAt', 'DESC')
      .addOrderBy('order.id', 'DESC')
      .skip(skip)
      .take(limit);

    const [orders, total] = await qb.getManyAndCount();

    return {
      data: orders.map((o) => this.toResponse(o)),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  private toResponse(order: Order) {
    return {
      id: order.id,
      subtotal: order.subtotal,
      discount: order.discount,
      total: order.total,
      paidAmount: order.paidAmount,
      debtAmount: order.debtAmount,
      paymentType: order.paymentType,
      paymentBreakdown: order.paymentBreakdown,
      customerId: order.customerId,
      status: order.status,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      items: (order.items ?? []).map((item) => ({
        id: item.id,
        quantity: item.quantity,
        selling_price: item.selling_price,
        purchase_price: item.purchase_price,
        discount: item.discount,
        total: item.total,
        returnedQuantity: item.returnedQuantity ?? 0,
        product: item.product && {
          id: item.product.id,
          name: item.product.name,
        },
      })),
      user: order.user && {
        id: order.user.id,
        name: order.user.fullName,
      },
    };
  }
}
