import { registerAs } from '@nestjs/config';

// .env fayliga quyidagilarni qo'shing (hozircha shartnoma yo'q bo'lgani uchun
// TEST/sandbox qiymatlarni Click va Payme merchant kabinetidan olasiz):
//
// SUBSCRIPTION_PRICE=300000
//
// CLICK_SERVICE_ID=12345
// CLICK_MERCHANT_ID=6789
// CLICK_SECRET_KEY=your_click_secret_key
//
// PAYME_MERCHANT_ID=your_payme_merchant_id
// PAYME_SECRET_KEY=your_payme_test_key
export default registerAs('payment', () => ({
  subscriptionPrice: Number(process.env.SUBSCRIPTION_PRICE ?? 300000), // so'mda

  click: {
    serviceId: process.env.CLICK_SERVICE_ID ?? '',
    merchantId: process.env.CLICK_MERCHANT_ID ?? '',
    secretKey: process.env.CLICK_SECRET_KEY ?? '',
  },

  payme: {
    merchantId: process.env.PAYME_MERCHANT_ID ?? '',
    secretKey: process.env.PAYME_SECRET_KEY ?? '',
  },
}));
