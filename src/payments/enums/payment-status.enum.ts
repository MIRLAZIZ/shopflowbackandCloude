// Umumiy payment holati (ikkala provider uchun ham universal)
export enum PaymentStatus {
  CREATED = 'CREATED', // Yaratildi, lekin hali tasdiqlanmagan (Payme: Create, Click: Prepare)
  PAID = 'PAID', // To'lov muvaffaqiyatli yakunlandi (Payme: Perform, Click: Complete)
  CANCELLED = 'CANCELLED', // Bekor qilindi (Payme: Cancel, Click: Complete error/cancel)
}
