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

// ⚠️ Bu yerda "kim EGA hisoblanadi" ro'yxati saqlanadi — "kim xodim
// hisoblanadi" emas. Sabab: xodim rollari kelajakda ko'payishi mumkin
// (Cashier, Agent, ertaga Menejer, Omborchi va h.k.). Agar biz xodim
// rollarini birma-bir sanab chiqsak, yangi rol qo'shilganda uni shu
// ro'yxatga qo'shishni "unutib qolish" ehtimoli bor — natijada yangi rol
// yana Admin/boshqa Client nomiga mahsulot yozib qo'yadi.
//
// Shuning uchun aksincha: faqat Client va Admin — mustaqil egalar.
// RO'YXATDA BO'LMAGAN har qanday rol (hozirgisi ham, keyingisi ham)
// avtomatik ravishda "xodim" deb hisoblanadi va ownerId createdBy'ga
// ko'tariladi.
const OWNER_ROLES = new Set<string>([Role.Client, Role.Admin]);

export function getOwnerId(user: AuthUserPayload | undefined | null): number {
  if (!user) {
    throw new Error('getOwnerId: foydalanuvchi topilmadi (req.user bo\'sh)');
  }

  const role = user.role as string | undefined;
  const createdBy = user.createdBy as any;

  // Rol ma'lum va u EGA ro'yxatida bo'lmasa (ya'ni xodim) — va createdBy
  // mavjud bo'lsa — ownerId uni yaratgan (do'kon egasi)ga ko'tariladi.
  if (role && !OWNER_ROLES.has(role) && createdBy !== null && createdBy !== undefined) {
    return typeof createdBy === 'object' ? createdBy.id : createdBy;
  }

  return user.id;
}
