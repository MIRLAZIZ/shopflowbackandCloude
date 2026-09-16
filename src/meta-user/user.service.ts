import { Injectable, BadRequestException, ForbiddenException, NotFoundException, ConflictException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { User } from './user.entity';
import UserDto from './dto/user.dto';
import * as bcrypt from 'bcrypt';
import { instanceToPlain } from 'class-transformer';
import ChangePasswordDto from './dto/password.dto';
import dayjs from 'dayjs';
import { Role } from 'common/enums/role.enum';
import { SubscriptionStatus } from 'common/enums/subscription-status.enum';
import { PaginationResponse } from 'common/interface/pagination.interface';
import { subscriptionManuallyDto } from './dto/subscription-manually.dto';


@Injectable()
export class UserService implements OnModuleInit {
  // 🔹 Konstantalar class darajasida
  private readonly PASSWORD_SALT_ROUNDS = 10;
  private readonly TRIAL_DAYS = 7;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>
  ) { }

  async onModuleInit() {
    const count = await this.userRepository.count();
    if (count === 0) {
      const user = new User();
      user.username = 'admin';
      user.fullName = "Mirlaziz Mirtolipov";
      user.password = await this.hashPassword('admin');
      user.role = Role.Admin;
      // Admin uchun subscription cheklovi kerak emas, shuning uchun uzoq muddat beramiz
      user.subscriptionStatus = SubscriptionStatus.ACTIVE;
      user.expiryDate = dayjs().add(100, 'year').toDate();
      await this.userRepository.save(user);
    }
  }

  // 🔹 Utility metodlar
  private generateTrialExpiry(): Date {
    return dayjs().add(this.TRIAL_DAYS, 'day').toDate();
  }

  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.PASSWORD_SALT_ROUNDS);
  }

  private validateRolePermission(
    currentUserRole: Role,
    targetRole: Role
  ): void {
    const permissions = {
      [Role.Admin]: [Role.Admin, Role.Agent, Role.Client],
      [Role.Agent]: [Role.Client],
      [Role.Client]: [Role.Cashier],
    };

    const allowedRoles = permissions[currentUserRole];

    if (!allowedRoles || !allowedRoles.includes(targetRole)) {
      const messages = {
        [Role.Admin]: "Admin Cashier yaratolmaydi",
        [Role.Agent]: "Agent faqat Client yaratishi mumkin",
        [Role.Client]: "Client faqat Cashier yaratishi mumkin",
      };
      throw new ForbiddenException(
        messages[currentUserRole] || "Sizda user yaratish huquqi yo'q"
      );
    }
  }

  private canAccessUser(user: User, currentUser: User): boolean {
    if (user.id === currentUser.id) return true;
    if (currentUser.role === Role.Admin) return true;
    if (
      (currentUser.role === Role.Agent || currentUser.role === Role.Client) &&
      user.createdBy?.id === currentUser.id
    ) {
      return true;
    }
    return false;
  }

  // 🔹 CRUD operatsiyalar
  async create(
    data: UserDto,
    createdById: number,
    currentUserRole: Role
  ): Promise<User> {
    this.validateRolePermission(currentUserRole, data.role);

    const hashPassword = await this.hashPassword(data.password);

    // Faqat Client (do'kon egasi) roli uchun trial beriladi.
    // Agent/Cashier kabi rollar do'kon egasining obunasiga bog'liq bo'lgani uchun
    // ularga alohida trial kerak emas.
    const isSubscribable = data.role === Role.Client;

    const user = this.userRepository.create({
      ...data,
      password: hashPassword,
      subscriptionStatus: isSubscribable ? SubscriptionStatus.TRIAL : SubscriptionStatus.ACTIVE,
      expiryDate: isSubscribable
        ? this.generateTrialExpiry()
        : dayjs().add(100, 'year').toDate(),
      createdBy: createdById ? ({ id: createdById } as User) : undefined
    });

    const savedUser = await this.userRepository.save(user);
    return instanceToPlain(savedUser) as User;
  }

  // 🔹 Payment muvaffaqiyatli bo'lgandan keyin chaqiriladi.
  // Agar foydalanuvchining amaldagi muddati (Trial yoki Active)
  // hali tugamagan bo'lsa, yangi 1 oy mavjud muddat ustiga qo'shiladi.
  // Agar muddat tugagan bo'lsa, hisob bugungi kundan boshlanadi.
  async activateSubscription(userId: number): Promise<User> {
    // 1. Userni bazadan olamiz
    const user = await this.userRepository.findOneOrFail({
      where: { id: userId },
    });

    const now = dayjs();

    /**
     * Hisoblash boshlanadigan sana:
     *
     * Misol 1:
     * Bugun:      2026-07-04
     * ExpiryDate: 2026-07-10 (Trial hali tugamagan)
     *
     * Natija:
     * 2026-08-10
     *
     * ------------------------------------
     *
     * Misol 2:
     * Bugun:      2026-07-04
     * ExpiryDate: 2026-08-15 (Active)
     *
     * Natija:
     * 2026-09-15
     *
     * ------------------------------------
     *
     * Misol 3:
     * Bugun:      2026-07-04
     * ExpiryDate: 2026-06-20 (Tugagan)
     *
     * Natija:
     * 2026-08-04
     */
    const base =
      user.expiryDate && dayjs(user.expiryDate).isAfter(now)
        ? dayjs(user.expiryDate)
        : now;

    // 2. Obunani aktiv qilamiz
    user.subscriptionStatus = SubscriptionStatus.ACTIVE;

    // 3. Mavjud muddat ustiga 1 kalendar oy qo'shamiz
    user.expiryDate = base.add(1, 'month').toDate();

    // 4. Oxirgi to'lov vaqtini saqlaymiz
    user.lastPaymentAt = now.toDate();

    // 5. Bazaga saqlaymiz
    return await this.userRepository.save(user);
  }

  // 🔹 Admin qo'lda qarzga vaqt qo'shganda chaqiriladi
async extendManually(
   subscriptionUserId: number,
    userId: number,
   data:subscriptionManuallyDto
): Promise<User> {
  const [subscriptionUser, adminUser] = await Promise.all([
  this.userRepository.findOneOrFail({
    where: { id: subscriptionUserId },
  }),
  this.userRepository.findOneOrFail({
    where: { id: userId },
  }),
]);


if(adminUser.role !== Role.Admin) {
  throw new ForbiddenException('Sizda foydalanuvchiga muddat qo\'shish huquqi yo\'q');
}
  const now = dayjs();

  // Obuna tugamagan bo'lsa eski muddatdan davom ettiramiz,
  // tugagan bo'lsa bugungi kundan boshlaymiz.
  const baseDate = dayjs(subscriptionUser.expiryDate).isAfter(now)
    ? dayjs(subscriptionUser.expiryDate)
    : now;

  subscriptionUser.expiryDate = baseDate.add(data.days, 'day').toDate();
  subscriptionUser.manualExtensionCount += 1;
  subscriptionUser.balance = Number(subscriptionUser.balance) - Number(data.debtAmount);
  subscriptionUser.adminNote = data.note?.trim() || '';
  subscriptionUser.subscriptionStatus = SubscriptionStatus.ACTIVE;

  return await this.userRepository.save(subscriptionUser);
}

  // 🔹 Har kuni cron job orqali chaqiriladi (muddati o'tganlarni EXPIRED qiladi)

async expireOverdueSubscriptions(): Promise<User[]> {
  const clients = await this.userRepository.find({
    where: {
      role: Role.Client,
      subscriptionStatus: SubscriptionStatus.ACTIVE,
      expiryDate: LessThan(new Date()),
    },
  });

  for (const client of clients) {
    client.subscriptionStatus = SubscriptionStatus.EXPIRED;
    await this.userRepository.save(client);

  
  }

  return clients;
}

  async findAll(userId: number, role: Role, page: number = 1, limit: number = 12,): Promise<PaginationResponse<User>> {


    const skip = (page - 1) * limit;



    const roleFilters = {
      [Role.Admin]: { role: Role.Client },
      [Role.Agent]: { role: Role.Client, createdBy: { id: userId } },
      [Role.Client]: { role: Role.Cashier, createdBy: { id: userId } },
    };



    const filter = roleFilters[role];
    if (!filter) {
      throw new BadRequestException('Invalid role');
    }

    const [users, total] = await this.userRepository.findAndCount({
      where: filter,
      relations: role !== Role.Admin ? ['createdBy'] : [],
      take: limit,
      skip: skip

    });



    return {
      data: users,
      meta: {
        page,
        limit,
        total: total,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  async findOne(id: number, currentUser: User): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['createdBy'],
    });

    if (!user) {
      throw new NotFoundException('Foydalanuvchi topilmadi');
    }

    if (!this.canAccessUser(user, currentUser)) {
      throw new ForbiddenException('Siz bu foydalanuvchini ko\'rish huquqiga ega emassiz');
    }

    return instanceToPlain(user) as User;
  }

  async delete(id: number, currentUser: User): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['createdBy'],
    });

    if (!user) {
      throw new NotFoundException('Foydalanuvchi topilmadi');
    }

    if ([Role.Agent, Role.Cashier].includes(currentUser.role)) {
      throw new ForbiddenException("Sizda foydalanuvchi o'chirish huquqi yo'q");
    }

    if (currentUser.role === Role.Admin) {
      await this.userRepository.delete(id);
      return;
    }

    if (currentUser.role === Role.Client) {
      if (user.createdBy?.id !== currentUser.id) {
        throw new ForbiddenException(
          "Siz faqat o'zingiz yaratgan foydalanuvchilarni o'chira olasiz"
        );
      }
      await this.userRepository.delete(id);
      return;
    }

    throw new ForbiddenException("Sizda foydalanuvchi o'chirish huquqi yo'q");
  }

  async update(
    id: number,
    data: Partial<UserDto>,
    currentUser: User
  ): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['createdBy']
    });

    if (!user) {
      throw new NotFoundException('Foydalanuvchi topilmadi');
    }

    if (data.password) {
      throw new BadRequestException("Parolni o'zgartirish huquqi yo'q");
    }

    const isOwnAccount = currentUser.id === id;
    const isCreator = user.createdBy?.id === currentUser.id;
    const isAdmin = currentUser.role === Role.Admin;
    const isClient = currentUser.role === Role.Client;

    if (!isAdmin) {
      if (isClient) {
        if (data.role && data.role !== user.role) {
          throw new ForbiddenException("Client foydalanuvchi rolini o'zgartira olmaydi");
        }
        if (!isOwnAccount && !isCreator) {
          throw new ForbiddenException(
            "Client faqat o'zini yoki o'zi yaratgan xodimlarni yangilay oladi"
          );
        }
      } else if (!isOwnAccount) {
        throw new ForbiddenException("Siz faqat o'z profilingizni yangilay olasiz");
      }
    }

    if (data.username && data.username !== user.username) {
      const existingUser = await this.userRepository.findOne({
        where: { username: data.username }
      });

      if (existingUser) {
        throw new ConflictException(`Username '${data.username}' allaqachon mavjud`);
      }
    }
    console.log(user, 'bu updatedan oldingi malumot');
    
    

    user.fullName = data.fullName ?? user.fullName;
    user.brandName = data.brandName ?? user.brandName;
    user.phone = data.phone ?? user.phone;
    user.role = data.role ?? user.role;
    user.username = data.username ?? user.username;
    




    await this.userRepository.save(user);
    console.log(user, 'bu updatedan keyingi xolat');
    
    return { message: "Foydalanuvchi muvaffaqiyatli yangilandi" };
  }

  async changePassword(
    id: number,
    dto: ChangePasswordDto,
    currentUser: User
  ): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['createdBy'],
    });

    if (!user) {
      throw new NotFoundException('Foydalanuvchi topilmadi');
    }

    const isAdmin = currentUser.role === Role.Admin;
    const isClient = currentUser.role === Role.Client;
    const isOwn = currentUser.id === id;
    const isCreator = user.createdBy?.id === currentUser.id;

    if (!isAdmin && !(isClient && (isOwn || isCreator)) && !isOwn) {
      throw new ForbiddenException("Ushbu foydalanuvchining parolini o'zgartirishga ruxsat yo'q");
    }

    user.password = await this.hashPassword(dto.password);
    return this.userRepository.save(user);
  }

  async findOneByUsername(username: string): Promise<User> {
    // ✅ createdBy yuklanadi — shu orqali kassir/xodim uchun ownerId
    // (do'kon egasi ID'si) JWT payload'ga qo'shiladi (qarang: getOwnerId)
    const user = await this.userRepository.findOne({
      where: { username },
      relations: ['createdBy'],
    });

    if (!user) {
      throw new NotFoundException('Parol yoki username xato');
    }

    return user;
  }

  async findById(id: number): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id },
      relations: ['createdBy'],
    });
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { username } });
  }

  async saveTelegramId(user: User, telegramId: number) {
    user.telegramId = telegramId;
    return this.userRepository.save(user);
  }

  async saveTelegramGroupId(user: User, groupId: number) {
    user.telegramGroupId = String(groupId);
    return this.userRepository.save(user);
  }

  async findByTelegramId(telegramId: number): Promise<User | null> {
    return this.userRepository.findOne({ where: { telegramId } });
  }

  async findByRoleClient(): Promise<User[]> {
    return this.userRepository.find({ where: { role: Role.Client } });
  }
}