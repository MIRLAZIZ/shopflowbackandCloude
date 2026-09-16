// notifications.gateway.ts
import { UseGuards } from '@nestjs/common';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
// import { JwtSocketGuard } from 'common/guards/jwt-socket.guard';
import { ReducedInterface } from 'common/interface/reduced.interface';
import { Server } from 'socket.io';

// @UseGuards(JwtSocketGuard)

@WebSocketGateway({ 
    namespace: '/notifications',   
    cors: true })
export class NotificationsGateway {
  @WebSocketServer()
  server: Server;



  sendNotification(data:ReducedInterface) {
    // console.log(data, 'bu sent notfiy');
    
    
    // this.server.to(userId.toString()).emit('new-sale', message);
    
    this.server.emit('new-sale', data);
  }
}
