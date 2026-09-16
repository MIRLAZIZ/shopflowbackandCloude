// common/utils/owner.util.ts
//
// Do'kon ma'lumotlari (mahsulot, sotuv, statistika) har doim DO'KON EGASI
// (owner) bo'yicha saqlanadi. Agar joriy foydalanuvchi kassir (yoki boshqa
// xodim) bo'lsa, uning `createdBy` maydoni do'kon egasiga ishora qiladi —
// shu holatda ownerId sifatida ana shu ID ishlatiladi, kassirning o'z ID'si
// emas. Egasining o'zi tizimga kirganda `createdBy` bo'lmaydi, shuning uchun
// ownerId = o'z ID'si bo'ladi.

export interface AuthUserPayload {
  id: number;
  username?: string;
  role?: string;
  createdBy?: { id: number } | number | null;
}

export function getOwnerId(user: AuthUserPayload | undefined | null): number {
  if (!user) {
    throw new Error('getOwnerId: foydalanuvchi topilmadi (req.user bo\'sh)');
  }

  const createdBy = user.createdBy as any;

  if (createdBy !== null && createdBy !== undefined) {
    return typeof createdBy === 'object' ? createdBy.id : createdBy;
  }

  return user.id;
}
