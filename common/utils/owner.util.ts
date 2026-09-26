// common/utils/owner.util.ts
//
// Do'kon ma'lumotlari (mahsulot, sotuv, statistika) har doim DO'KON EGASI
// (owner) bo'yicha saqlanadi.
//
// MUHIM: `createdBy` ikki xil holatda ishlatiladi va ular bir-biriga
// aralashtirilmasligi kerak:
//   1) Admin -> Client yaratadi   (Client.createdBy = Admin)
//   2) Client -> Cashier yaratadi (Cashier.createdBy = Client)
//
// Faqat XODIM rollari (masalan Cashier) uchun ownerId yuqoriga —
// createdBy'ga — ko'tariladi. Client roli har doim O'ZI ega hisoblanadi,
// uni kim ro'yxatdan o'tkazgani (Admin bo'lsa ham) ownerId'ga ta'sir
// qilmasligi kerak — aks holda Client yaratgan mahsulot Admin'ga
// yozilib qoladi (bu aynan shu bug edi).

import { Role } from 'common/enums/role.enum';

export interface AuthUserPayload {
  id: number;
  username?: string;
  role?: Role | string;
  createdBy?: { id: number } | number | null;
}

// Faqat shu rollar uchun ownerId createdBy'ga ko'tariladi. Client va Admin
// har doim o'zlarining ID'si bilan egalik qiladi.
const DELEGATED_ROLES = new Set<string>([Role.Cashier, Role.Agent]);

export function getOwnerId(user: AuthUserPayload | undefined | null): number {
  if (!user) {
    throw new Error('getOwnerId: foydalanuvchi topilmadi (req.user bo\'sh)');
  }

  const role = user.role as string | undefined;
  const createdBy = user.createdBy as any;

  if (role && DELEGATED_ROLES.has(role) && createdBy !== null && createdBy !== undefined) {
    return typeof createdBy === 'object' ? createdBy.id : createdBy;
  }

  return user.id;
}
