import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  // OnGatewayConnection,
  // OnGatewayDisconnect
} from '@nestjs/websockets';
import { Socket, Server } from 'socket.io';
import { StatisticsService } from './statistics.service';
import { forwardRef, Inject, UseGuards } from '@nestjs/common';
import { JwtSocketGuard } from 'common/guards/jwt-socket.guard';



@UseGuards(JwtSocketGuard)
@WebSocketGateway({
  namespace: '/statistics',
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class StatisticsGateway  {
  @WebSocketServer()
  server: Server;

  // ✅ StatisticsService'ni inject qilish
  constructor(
    @Inject(forwardRef(() => StatisticsService))
    private statisticsService: StatisticsService
  ) { }

  // handleConnection(client: Socket) {
  //   console.log('✅ Client connected:', client.id);
  // }

  // handleDisconnect(client: Socket) {
  //   console.log('❌ Client disconnected:', client.id);
  // }

  // ✅ Haqiqiy ma'lumotni qaytarish
  @SubscribeMessage('getTodayStats')
  async handleGetTodayStats(
    @ConnectedSocket() client: Socket
  ) {
    const data = client.data.user



    try {
      client.join(data.id.toString());
      // Haqiqiy ma'lumotni olish
      const stats = await this.statisticsService.getTodayStats(data.id);

      // Faqat so'ragan clientga yuborish
      return {
        event: 'todayStats',
        data: stats,
      };

    } catch (error) {
      return {
        event: 'todayStats',
        data: { error: 'Ma\'lumot olishda xatolik' },
      };
    }
  }

  // Real-time yangilanishlarni yuborish
  sendStatsUpdate(userId: number, stats: any) {

    this.server.to(userId.toString()).emit('statsUpdated', {
      userId,
      stats,
      timestamp: new Date().toISOString(),
    });
  }


}