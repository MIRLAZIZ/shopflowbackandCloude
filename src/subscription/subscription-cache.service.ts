import { Injectable } from '@nestjs/common';

/**
 * Do'kon egasi (Client) obunasi holatini xotirada saqlaydi.
 * Kalit: ownerId, qiymat: true = bloklangan, false = faol.
 * Xodimlar (Cashier) ham o'z egasining ownerId si bilan tekshiriladi.
 *
 * Eslatma: Map da TTL yo'q, shuning uchun qiymat faqat quyidagi
 * metodlar chaqirilganda yangilanadi (cron, to'lov, admin o'zgartirishi).
 */
@Injectable()
export class SubscriptionCacheService {
  private readonly blocked = new Map<number, boolean>();

  /** true / false, cache'da yo'q bo'lsa undefined */
  isBlocked(ownerId: number): boolean | undefined {
    return this.blocked.get(ownerId);
  }

  set(ownerId: number, value: boolean): void {
    this.blocked.set(ownerId, value);
  }

  /** Cron yoki admin bloklaganda chaqiring */
  block(ownerId: number): void {
    this.blocked.set(ownerId, true);
  }

  /** To'lov qilinganda yoki obuna uzaytirilganda chaqiring */
  unblock(ownerId: number): void {
    this.blocked.set(ownerId, false);
  }

  /** Yozuvni o'chiradi, keyingi so'rovda DB'dan qayta o'qiladi */
  clear(ownerId: number): void {
    this.blocked.delete(ownerId);
  }
}
