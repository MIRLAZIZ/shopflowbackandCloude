import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager, Between } from 'typeorm';
import { Statistics } from './entities/statistic.entity';
import { StatisticsGateway } from './statistics.geteway';
import { Order } from 'src/orders/entities/order.entity';
import { Debt } from 'src/debts/entities/debt.entity';
import { Product } from 'src/products/entities/product.entity';
import { OrderStatus } from 'common/enums/order-status.enum';
import { DebtStatus } from 'common/enums/debt-status.enum';
import { StockFilter } from 'common/enums/product-stock.enum';

const round2 = (v: number) => Math.round(v * 100) / 100;


@Injectable()
export class StatisticsService {
  constructor(
    @InjectRepository(Statistics)
    private statisticsRepo: Repository<Statistics>,
    @InjectRepository(Order)
    private orderRepo: Repository<Order>,
    @InjectRepository(Debt)
    private debtRepo: Repository<Debt>,
    @InjectRepository(Product)
    private productRepo: Repository<Product>,

    @Inject(forwardRef(() => StatisticsGateway))
    private statisticsGateway: StatisticsGateway
  ) { }

  /**
   * Boshqaruv paneli uchun yagona, to'liq xulosa: davr bo'yicha tushum,
   * foyda, cheklar soni, to'lov turlari kesimi, eng ko'p sotilgan
   * mahsulotlar, kunlik grafik, qarzdorlik va kam qolgan tovarlar.
   */
  async getDashboard(ownerId: number, period: 'today' | 'week' | 'month' | 'year' = 'week') {
    const dateTo = new Date();
    const dateFrom = new Date();
    if (period === 'today') dateFrom.setHours(0, 0, 0, 0);
    else if (period === 'week') dateFrom.setDate(dateFrom.getDate() - 7);
    else if (period === 'month') dateFrom.setDate(dateFrom.getDate() - 30);
    else dateFrom.setDate(dateFrom.getDate() - 365);

    const orders = await this.orderRepo
      .createQueryBuilder('o')
      .where('o.owner_id = :ownerId', { ownerId })
      .andWhere('o.status = :status', { status: OrderStatus.COMPLETED })
      .andWhere('o.createdAt BETWEEN :from AND :to', { from: dateFrom, to: dateTo })
      .getMany();

    const totalRevenue = round2(orders.reduce((s, o) => s + o.total, 0));
    const totalOrders = orders.length;
    const totalDiscount = round2(orders.reduce((s, o) => s + o.discount, 0));
    const averageOrderValue = totalOrders ? round2(totalRevenue / totalOrders) : 0;

    // To'lov turlari kesimi
    const revenueByPaymentType: Record<string, number> = { cash: 0, card: 0, transfer: 0, mixed: 0 };
    for (const o of orders) {
      revenueByPaymentType[o.paymentType] = round2((revenueByPaymentType[o.paymentType] ?? 0) + o.paidAmount);
    }

    // Kunlik tushum (grafik uchun)
    const dailyMap = new Map<string, number>();
    for (const o of orders) {
      const day = o.createdAt.toISOString().slice(0, 10);
      dailyMap.set(day, round2((dailyMap.get(day) ?? 0) + o.total));
    }
    const dailyRevenue = Array.from(dailyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, revenue]) => ({ date, revenue }));

    // Statistics jadvalidan: foyda va eng ko'p sotilgan mahsulotlar
    const statsRows = await this.statisticsRepo
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.product', 'product')
      .where('s.user_id = :ownerId', { ownerId })
      .andWhere('s.date BETWEEN :from AND :to', {
        from: dateFrom.toISOString().slice(0, 10),
        to: dateTo.toISOString().slice(0, 10),
      })
      .getMany();

    const totalProfit = round2(statsRows.reduce((s, r) => s + Number(r.total_profit), 0));

    const productMap = new Map<number, { productId: number; productName: string; quantity: number; revenue: number; profit: number }>();
    for (const r of statsRows) {
      const existing = productMap.get(r.product.id) ?? {
        productId: r.product.id,
        productName: r.product.name,
        quantity: 0,
        revenue: 0,
        profit: 0,
      };
      existing.quantity += Number(r.total_quantity);
      existing.revenue = round2(existing.revenue + Number(r.total_sales));
      existing.profit = round2(existing.profit + Number(r.total_profit));
      productMap.set(r.product.id, existing);
    }
    const topProducts = Array.from(productMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Qarzdorlik (davr bilan bog'liq emas — joriy holat)
    const { sum: totalOutstandingDebt } = await this.debtRepo
      .createQueryBuilder('d')
      .select('COALESCE(SUM(d.remainingAmount), 0)', 'sum')
      .where('d.owner_id = :ownerId', { ownerId })
      .andWhere('d.status = :status', { status: DebtStatus.OPEN })
      .getRawOne();

    // Kam qolgan / tugagan mahsulotlar soni (joriy holat)
    const lowStockCount = await this.productRepo.count({
      where: { user: { id: ownerId } as any, stock: StockFilter.LOW_STOCK },
    });
    const outOfStockCount = await this.productRepo.count({
      where: { user: { id: ownerId } as any, stock: StockFilter.OUT_OF_STOCK },
    });

    return {
      period,
      dateFrom: dateFrom.toISOString(),
      dateTo: dateTo.toISOString(),
      totalRevenue,
      totalProfit,
      totalDiscount,
      totalOrders,
      averageOrderValue,
      revenueByPaymentType,
      dailyRevenue,
      topProducts,
      totalOutstandingDebt: round2(Number(totalOutstandingDebt) || 0),
      lowStockCount,
      outOfStockCount,
    };
  }

  async createOrUpdate(
    manager: EntityManager,
    data: CreateOrUpdateStatsInput,
  ): Promise<Statistics> {
    const today = new Date().toISOString().slice(0, 10);

    let stats = await manager.findOne(Statistics, {
      where: {
        user: { id: data.userId },
        product: { id: data.productId },
        date: today,
      },
    });

    // 🆕 AGAR YO‘Q BO‘LSA — O‘ZIMIZ BOSHLAB BERAMIZ
    if (!stats) {
      stats = manager.create(Statistics, {
        user: { id: data.userId } as any,
        product: { id: data.productId } as any,
        date: today,

        total_sales: data.totalSales,
        total_quantity: data.quantity,
        total_transactions: 1,
        total_discount: data.discount,
        total_profit: data.profit,
      });
    }
    // ♻️ BOR BO‘LSA — QO‘SHIB BORAMIZ
    else {


      stats.total_sales += data.totalSales;
      stats.total_quantity += data.quantity;
      stats.total_transactions += 1;
      stats.total_discount += data.discount;
      stats.total_profit += data.profit;
    }

    await manager.save(stats);


    // socket.emit('stats', stats);
    this.statisticsGateway.sendStatsUpdate(data.userId, stats);



    return stats;
  }


  // Bugungi statistikani olish
  async getTodayStats(userId: number) {
    const today = new Date().toISOString().split('T')[0];

    const stats = await this.statisticsRepo.find({
      where: { user: { id: userId }, date: today, },
      relations: ['product', 'user'],
    });
    const responseData = stats.map((stat) => ({
      id: stat.id,
      user: stat.user.id,
      userName: stat.user.fullName,
      productId: stat.product.id,
      productName: stat.product.name,
      date: stat.date,
      total_sales: stat.total_sales,
      total_quantity: stat.total_quantity,
      total_transactions: stat.total_transactions,
      total_profit: stat.total_profit,
      total_discount: stat.total_discount,
    }));




    return responseData;
  }

  /**
   * Returns the statistics for the given user id for the past week.
   * @param userId - The id of the user for which to retrieve statistics.
   * @returns An array of statistics objects, each representing the statistics for a given date.
   */
  async weeklyStats(userId: number) {
    const today = new Date().toISOString().split('T')[0];
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 7);

    const stats = await this.statisticsRepo.find({
      where: {
        user: { id: userId },
        date: Between(startDate.toISOString(), today),
      },
      relations: ['product', 'user'],

    });

    const data = stats.map((stat) => ({
      id: stat.id,
      user: stat.user.id,
      userName: stat.user.fullName,
      productId: stat.product.id,
      productName: stat.product.name,
      date: stat.date,
      total_sales: stat.total_sales,
      total_quantity: stat.total_quantity,
      total_transactions: stat.total_transactions,
      total_profit: stat.total_profit,
      total_discount: stat.total_discount,
    }));

    return data;
  }

  async getMonthlyStats(userId: number) {
    const today = new Date().toISOString().split('T')[0];
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 30);

    const stats = await this.statisticsRepo.find({
      where: {
        user: { id: userId },
        date: Between(startDate.toISOString(), today),
      },
      relations: ['product', 'user'],
    });

    const data = stats.map((stat) => ({
      id: stat.id,
      user: {
        id: stat.user.id,
        fullName: stat.user.fullName,
      },
      product: {
        id: stat.product.id,
        name: stat.product.name,
      },
      date: stat.date,
      total_sales: stat.total_sales,
      total_quantity: stat.total_quantity,
      total_transactions: stat.total_transactions,
      total_profit: stat.total_profit,
      total_discount: stat.total_discount,
    }));

    return data;
  }


  // yillik statistikani olish

  async getYearlyStats(userId: number) {
    const today = new Date().toISOString().split('T')[0];
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 365);

    const stats = await this.statisticsRepo.find({
      where: {
        user: { id: userId },
        date: Between(startDate.toISOString(), today),
      },
      relations: ['product', 'user'],
    });

    const data = stats.map((stat) => ({
      id: stat.id,
      user: {
        id: stat.user.id,
        fullName: stat.user.fullName,
      },
      product: {
        id: stat.product.id,
        name: stat.product.name,
      },
      date: stat.date,
      total_sales: stat.total_sales,
      total_quantity: stat.total_quantity,
      total_transactions: stat.total_transactions,
      total_profit: stat.total_profit,
      total_discount: stat.total_discount,
    }));

    return data;
  }
 


}