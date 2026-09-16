import { Controller, Post, Body } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { Role } from 'common/enums/role.enum';
import { Roles } from 'common/decorators/roles.decorator';

@Controller('telegram')
export class TelegramController {
    constructor(private readonly telegramService: TelegramService) { }


    @Roles(Role.Admin)
    @Post('send-user')
    async sendToUser(@Body() body: { username: string; message: string }) {

        return await this.telegramService.sendToUser(body.username, body.message);
    }

   


    //   @Post('send-admin')
    //   async sendToAdmin(@Body() body: { message: string }) {
    //     await this.telegramService.sendToAdmin(body.message);
    //     return { status: 'ok' };
    //   }


    @Roles(Role.Admin)
    @Post('send-group')
    async sendToGroup(@Body() body: { userId: number; message: string }) {
        return await this.telegramService.sendToGroup(body.userId, body.message);

    }
}