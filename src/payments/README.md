# Payments moduli (Click + Payme)

Shartnoma hali yo'q bo'lgani uchun bu modul ikkala provayderning **rasmiy, umumga ochiq
merchant API** spetsifikatsiyasiga mos yozilgan. Shartnoma tuzilgach, Click va Payme
kabinetidan haqiqiy `service_id` / `merchant_id` / `secret_key` olib, faqat `.env`ni
to'ldirasiz — kod o'zgarmaydi. Sinov uchun ikkala tizim ham **sandbox/test rejimini**
taqdim etadi.

## O'rnatish

```bash
npm install uuid
npm install -D @types/uuid
```

## .env

```env
SUBSCRIPTION_PRICE=300000

CLICK_SERVICE_ID=
CLICK_MERCHANT_ID=
CLICK_SECRET_KEY=

PAYME_MERCHANT_ID=
PAYME_SECRET_KEY=
```

## Loyihaga ulash

1. Bu papkani `src/payments` ichiga ko'chiring.
2. `payment.entity.ts`, `payments.service.ts`, `payments.module.ts` ichidagi
   `import { User } from 'src/users/entities/user.entity'` va
   `import { UsersService } from 'src/users/users.service'` yo'llarini
   loyihangizdagi haqiqiy joylashuvga moslang.
3. `UsersModule`da `UsersService`ni **export** qilganingizga ishonch hosil qiling
   (aks holda `PaymentsModule` uni import qila olmaydi):
   ```typescript
   @Module({
     providers: [UsersService],
     exports: [UsersService],
   })
   export class UsersModule {}
   ```
4. `app.module.ts`ga qo'shing:
   ```typescript
   imports: [PaymentsModule],
   ```
5. TypeORM `synchronize: false` bo'lsa, `Payment` jadvali uchun migration yarating.

## Endpointlar

| Endpoint | Vazifasi |
|---|---|
| `POST /payments/click/invoice/:userId` | Click checkout URL yaratadi |
| `POST /payments/click/webhook` | Click serverlaridan keladigan Prepare/Complete |
| `POST /payments/payme/invoice/:userId` | Payme checkout URL yaratadi |
| `POST /payments/payme/webhook` | Payme serverlaridan keladigan JSON-RPC so'rovlar |

## Oqim (flow)

1. Foydalanuvchi to'lovni boshlaganda frontend/bot `invoice/:userId`ni chaqiradi.
2. Backend `Payment` yozuvini `CREATED` holatida yaratadi va checkout URL qaytaradi.
3. Foydalanuvchi Click/Payme sahifasida to'laydi.
4. Click/Payme o'z serveridan bizning `webhook` endpointimizga so'rov yuboradi
   (imzo/avtorizatsiya tekshiriladi → summasi solishtiriladi → holat yangilanadi).
5. To'lov muvaffaqiyatli bo'lsa, `PaymentsService.markAsPaidAndActivate()` chaqiriladi,
   u esa `UsersService.activateSubscription(userId)`ni ishga tushiradi — obuna
   avtomatik uzaytiriladi.

## Idempotentlik

Ikkala provayder ham webhookni bir necha marta qayta yuborishi mumkin (tarmoq xatosi,
retry). Shuning uchun:
- `Payment.merchantTransId` — **unique** ustun (bir xil invoice ikki marta yaratilmaydi).
- `markAsPaidAndActivate()` — agar status allaqachon `PAID` bo'lsa, `activateSubscription`ni
  qayta chaqirmaydi.
- Payme `CreateTransaction` va `PerformTransaction` metodlarida ham mavjud yozuv
  tekshiriladi va bir xil javob qaytariladi (Payme protokoli buni talab qiladi).

## Muhim: hali test qilinmagan joylar

- **Click**: `merchant_prepare_id` sifatida bizning ichki `payment.id`ni ishlatdim —
  bu Click hujjatidagi standart yondashuv, lekin haqiqiy sandbox bilan albatta test qiling.
- **Payme**: `GetStatement` metodi hozircha yozilmagan (odatda majburiy emas, lekin
  Payme sertifikatsiyasida so'ralishi mumkin — kerak bo'lsa qo'shib beraman).
- **Xavfsizlik**: production'ga chiqishdan oldin webhook endpointlarini faqat
  Click/Payme IP range'laridan qabul qiladigan qilib cheklashni tavsiya qilaman
  (`nestjs` guard yoki nginx darajasida).
