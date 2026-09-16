import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { PaymentsService } from '../payments.service';
import { PaymentProvider } from '../enums/payment-provider.enum';
import { PaymentStatus } from '../enums/payment-status.enum';
import { ClickRequestDto } from './dto/click-request.dto';
import { ClickAction, ClickError } from './click.constants';

@Injectable()
export class ClickService {
  private readonly logger = new Logger(ClickService.name);

  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly configService: ConfigService,
  ) {}

  private get serviceId(): string {
    return this.configService.get<string>('payment.click.serviceId')!;
  }

  private get merchantId(): string {
    return this.configService.get<string>('payment.click.merchantId')!;
  }

  private get secretKey(): string {
    return this.configService.get<string>('payment.click.secretKey')!;
  }

  /**
   * Foydalanuvchi to'lovni boshlashi uchun invoice yaratamiz va
   * Click checkout sahifasiga yo'naltiruvchi URL qaytaramiz.
   * NOTE: shartnoma va aniq service_id/secret_key kelgach .env'ga yozing;
   * hozircha bu funksiya test (sandbox) kalitlar bilan ham ishlaydi.
   */
  async generateInvoice(userId: number): Promise<{ payUrl: string; merchantTransId: string }> {
    const amount = this.paymentsService.subscriptionPrice;
    const merchantTransId = uuidv4();

    await this.paymentsService.createPending({
      provider: PaymentProvider.CLICK,
      userId,
      merchantTransId,
      amount,
    });

    const payUrl =
      `https://my.click.uz/services/pay?service_id=${this.serviceId}` +
      `&merchant_id=${this.merchantId}` +
      `&amount=${amount}` +
      `&transaction_param=${merchantTransId}`;

    return { payUrl, merchantTransId };
  }

  private verifySign(dto: ClickRequestDto): boolean {
    const {
      click_trans_id,
      service_id,
      merchant_trans_id,
      merchant_prepare_id,
      amount,
      action,
      sign_time,
      sign_string,
    } = dto;

    const isComplete = Number(action) === ClickAction.COMPLETE;

    const raw = isComplete
      ? `${click_trans_id}${service_id}${this.secretKey}${merchant_trans_id}${merchant_prepare_id}${amount}${action}${sign_time}`
      : `${click_trans_id}${service_id}${this.secretKey}${merchant_trans_id}${amount}${action}${sign_time}`;

    const expected = crypto.createHash('md5').update(raw).digest('hex');
    return expected === sign_string;
  }

  async handlePrepare(dto: ClickRequestDto) {
    if (!this.verifySign(dto)) {
      return this.buildResponse(dto, { error: ClickError.SIGN_CHECK_FAILED, error_note: 'SIGN CHECK FAILED!' });
    }

    const payment = await this.paymentsService.findByMerchantTransId(dto.merchant_trans_id);
    if (!payment) {
      return this.buildResponse(dto, { error: ClickError.USER_NOT_FOUND, error_note: 'Invoice topilmadi' });
    }

    if (payment.status === PaymentStatus.CANCELLED) {
      return this.buildResponse(dto, { error: ClickError.TRANSACTION_CANCELLED, error_note: 'Tranzaksiya bekor qilingan' });
    }

    if (Number(dto.amount) !== Number(payment.amount)) {
      return this.buildResponse(dto, { error: ClickError.INVALID_AMOUNT, error_note: "Summa noto'g'ri" });
    }

    // Click'ning o'z tranzaksiya ID'sini saqlab qo'yamiz
    payment.providerTransId = dto.click_trans_id;
    payment.rawPayload = { ...dto };
    await this.paymentsService.save(payment);

    return this.buildResponse(dto, {
      error: ClickError.SUCCESS,
      error_note: 'Success',
      merchant_prepare_id: payment.id, // Complete bosqichida qaytib keladi
    });
  }

  async handleComplete(dto: ClickRequestDto) {
    if (!this.verifySign(dto)) {
      return this.buildResponse(dto, { error: ClickError.SIGN_CHECK_FAILED, error_note: 'SIGN CHECK FAILED!' });
    }

    const payment = await this.paymentsService.findByMerchantTransId(dto.merchant_trans_id);
    if (!payment) {
      return this.buildResponse(dto, { error: ClickError.TRANSACTION_NOT_FOUND, error_note: 'Tranzaksiya topilmadi' });
    }

    // Click ba'zan action=1'ni error!=0 bilan yuboradi (foydalanuvchi bekor qilgan holat)
    if (Number(dto.error) < 0) {
      await this.paymentsService.markAsCancelled(payment, Number(dto.error));
      return this.buildResponse(dto, { error: ClickError.SUCCESS, error_note: 'Cancelled' });
    }

    // Idempotentlik: ikkinchi marta Complete kelsa, qayta faollashtirmaymiz
    if (payment.status === PaymentStatus.PAID) {
      return this.buildResponse(dto, { error: ClickError.ALREADY_PAID, error_note: 'Already paid' });
    }

    if (Number(dto.amount) !== Number(payment.amount)) {
      return this.buildResponse(dto, { error: ClickError.INVALID_AMOUNT, error_note: "Summa noto'g'ri" });
    }

    await this.paymentsService.markAsPaidAndActivate(payment);

    return this.buildResponse(dto, {
      error: ClickError.SUCCESS,
      error_note: 'Success',
      merchant_confirm_id: payment.id,
    });
  }

  private buildResponse(
    dto: ClickRequestDto,
    extra: { error: ClickError; error_note: string; merchant_prepare_id?: number; merchant_confirm_id?: number },
  ) {
    return {
      click_trans_id: dto.click_trans_id,
      merchant_trans_id: dto.merchant_trans_id,
      ...extra,
    };
  }
}
