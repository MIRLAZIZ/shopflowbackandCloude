export class PaymeRequestDto {
  method!: string;
  params!: {
    id?: string; // Payme tranzaksiya ID'si
    time?: number;
    amount?: number; // TIYINDA keladi (1 so'm = 100 tiyin)
    account?: { order_id?: string }; // biz belgilagan hisob maydoni
    reason?: number;
    from?: number;
    to?: number;
  };
  id!: number; // JSON-RPC so'rov ID'si (javobda qaytariladi)
}
