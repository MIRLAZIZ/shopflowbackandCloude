// src/meta-user/user.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { UserService } from './user.service';
import { UserController } from './user.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User]),], // User entityni TypeORM ga ulaymiz
  controllers: [UserController],               // REST endpointlar
  providers: [UserService],                    // Biznes mantiq
  exports: [UserService],                      // Agar boshqa modullarda ishlatmoqchi bo‘lsangiz
})
export class UserModule {}
