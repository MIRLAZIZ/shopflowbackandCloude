import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager, Between } from 'typeorm';
import { Statistics } from './entities/statistic.entity';
import { StatisticsGateway } from './statistics.geteway';


@Injectable()
export class StatisticsService {
  constructor(
    @InjectRepository(Statistics)
    private statisticsRepo: Repository<Statistics>,

    @Inject(forwardRef(() => StatisticsGateway))
    private statisticsGateway: StatisticsGateway
  ) { }

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