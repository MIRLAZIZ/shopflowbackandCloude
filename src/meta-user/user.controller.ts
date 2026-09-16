import { Controller, Get, Post, Body, Delete, Param, ParseIntPipe, Put, UseGuards, Req, Query } from '@nestjs/common';
import { UserService } from './user.service';
import UserDto from './dto/user.dto';
import ChangePasswordDto from './dto/password.dto';
import { RolesGuard } from 'common/guards/roles.guard';
import { Role } from 'common/enums/role.enum';
import { Roles } from 'common/decorators/roles.decorator';
import { CurrentUser } from 'common/decorators/current-user.decarotor';
import { User } from './user.entity';
import { subscriptionManuallyDto } from './dto/subscription-manually.dto';

@Controller('users')
@UseGuards(RolesGuard)
export class UserController {
  constructor(private readonly userService: UserService) { }

  @Post()
  @Roles(Role.Admin, Role.Agent, Role.Client)
  create(@Body() data: UserDto, @Req() req) {
    // data._role = req.user.role
    // console.log(data, req.user.role);



    return this.userService.create(data, req.user.id, req.user.role);
  }

  @Get()
  @Roles(Role.Admin, Role.Agent, Role.Client)
  findAll(@CurrentUser() user:User) {

    const role = user.role
    

    return this.userService.findAll(user.id, role);

  }


  @Get(':id')
  @Roles(Role.Admin, Role.Agent, Role.Client)
  findOne(@Param('id') id: string, @Req() req) {
   
    

    return this.userService.findOne(+id, req.user); // stringni numberga aylantiramiz
  }


  @Delete(':id')
  @Roles(Role.Admin, Role.Client) 
  async remove(@Param('id', ParseIntPipe) id: number, @Req() req) {
    await this.userService.delete(id, req.user);
    return { success: true, message: `Foydalanuvchi ${id} muvaffaqiyatli o‘chirildi` };;
  }

  @Put(':id')
  @Roles(Role.Admin, Role.Client)
  update(@Param('id', ParseIntPipe) id: number, @Body() data: Partial<UserDto>, @Req() req) {

    return this.userService.update(id, data, req.user);
  }

  // @Roles(Role.Admin, Role.Client)
  @Put('change-password/:id')
  async changePassword(@Param('id', ParseIntPipe) id: number, @Body() changePasswordDto: ChangePasswordDto, @Req() req) {
    await this.userService.changePassword(id, changePasswordDto, req.user);
    return { success: true, message: `Foydalaniuvchi parol muvaffaqiyatli o‘zgartirildi ` };
  }

  @Put(':id/subscription/extend')
  @Roles(Role.Admin)
  extendSubscription( @CurrentUser() user: User, @Param('id', ParseIntPipe) id: number, @Body() data:subscriptionManuallyDto ) {
    return this.userService.extendManually(id, user.id, data );
  }
}
