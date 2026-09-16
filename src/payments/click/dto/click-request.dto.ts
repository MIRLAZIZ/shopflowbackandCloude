// Click Prepare va Complete so'rovlarida keladigan barcha maydonlar.
// Ikkalasi ham shu formatda keladi, faqat `action` va `merchant_prepare_id` farq qiladi.
export class ClickRequestDto {
  click_trans_id!: string;
  service_id!: string;
  click_paydoc_id!: string;
  merchant_trans_id!: string;
  merchant_prepare_id?: string; // faqat Complete bosqichida keladi
  amount!: string;
  action!: string; // '0' = Prepare, '1' = Complete
  error!: string;
  error_note!: string;
  sign_time!: string;
  sign_string!: string;
}
