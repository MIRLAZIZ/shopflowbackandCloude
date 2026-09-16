import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { PaymentsService } from '../payments.service';
import { PaymentProvider } from '../enums/payment-provider.enum';
import { PaymentStatus } from '../enums/payment-status.enum';
import { PaymeRequestDto } from './dto/payme-request.dto';
import { PaymeError, PaymeMethod, PaymeTransactionState } from './payme.constants';

@Injectable()
export class PaymeService {
  private readonly logger = new Logger(PaymeService.name);

  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly configService: ConfigService,
  ) {}

  private get merchantId(): string {
    return this.configService.get<string>('payment.payme.merchantId')!;
  }

  private get secretKey(): string {
    return this.configService.get<string>('payment.payme.secretKey')!;
  }

  /**
   * Authorization: Basic base64("Paycom:" + KEY) headerini tekshiradi.
   * Controller darajasidagi guard/interceptor sifatida ham chiqarsa bo'ladi,
   * lekin oddiylik uchun shu yerda.
   */
  verifyAuth(authHeader: string | undefined): boolean {
    if (!authHeader?.startsWith('Basic ')) return false;
    const decoded = Buffer.from(authHeader.replace('Basic ', ''), 'base64').toString('utf-8');
    const [login, key] = decoded.split(':');
    return login === 'Paycom' && key === this.secretKey;
  }

  /**
   * Foydalanuvchi to'lovni boshlashi uchun invoice (order_id) yaratamiz
   * va Payme checkout URL'ini qaytaramiz.
   */
  async generateInvoice(userId: number): Promise<{ payUrl: string; merchantTransId: string }> {
    const amount = this.paymentsService.subscriptionPrice; // so'mda
    const merchantTransId = uuidv4();

    await this.paymentsService.createPending({
      provider: PaymentProvider.PAYME,
      userId,
      merchantTransId,
      amount,
    });

    const amountInTiyin = amount * 100;
    const params = `m=${this.merchantId};ac.order_id=${merchantTransId};a=${amountInTiyin}`;
    const encoded = Buffer.from(params).toString('base64');
    const payUrl = `https://checkout.paycom.uz/${encoded}`;

    return { payUrl, merchantTransId };
  }

  /**
   * Kelgan JSON-RPC so'rovini metod nomiga qarab yo'naltiradi.
   */
  async handle(dto: PaymeRequestDto) {
    switch (dto.method) {
      case PaymeMethod.CHECK_PERFORM_TRANSACTION:
        return this.checkPerformTransaction(dto);
      case PaymeMethod.CREATE_TRANSACTION:
        return this.createTransaction(dto);
      case PaymeMethod.PERFORM_TRANSACTION:
        return this.performTransaction(dto);
      case PaymeMethod.CANCEL_TRANSACTION:
        return this.cancelTransaction(dto);
      case PaymeMethod.CHECK_TRANSACTION:
        return this.checkTransaction(dto);
      default:
        return this.error(dto.id, PaymeError.METHOD_NOT_FOUND, 'Method not found');
    }
  }

  private async checkPerformTransaction(dto: PaymeRequestDto) {
    const orderId = dto.params.account?.order_id;
    const amountTiyin = dto.params.amount ?? 0;

    const payment = orderId ? await this.paymentsService.findByMerchantTransId(orderId) : null;
    if (!payment) {
      return this.error(dto.id, PaymeError.ACCOUNT_NOT_FOUND, 'Order topilmadi', 'order_id');
    }

    if (Math.round(payment.amount * 100) !== amountTiyin) {
      return this.error(dto.id, PaymeError.INVALID_AMOUNT, "Summa noto'g'ri");
    }

    return this.result(dto.id, { allow: true });
  }

  private async createTransaction(dto: PaymeRequestDto) {
    const orderId = dto.params.account?.order_id;
    const amountTiyin = dto.params.amount ?? 0;
    const paymeTransId = dto.params.id!;

    const payment = orderId ? await this.paymentsService.findByMerchantTransId(orderId) : null;
    if (!payment) {
      return this.error(dto.id, PaymeError.ACCOUNT_NOT_FOUND, 'Order topilmadi', 'order_id');
    }

    if (Math.round(payment.amount * 100) !== amountTiyin) {
      return this.error(dto.id, PaymeError.INVALID_AMOUNT, "Summa noto'g'ri");
    }

    // Idempotentlik: shu Payme tranzaksiyasi bo'yicha allaqachon yozuv bo'lsa, uni qaytaramiz
    const existing = await this.paymentsService.findByProviderTransId(
      PaymentProvider.PAYME,
      paymeTransId,
    );
    if (existing) {
      if (existing.status === PaymentStatus.CANCELLED) {
        return this.error(dto.id, PaymeError.COULD_NOT_PERFORM, 'Tranzaksiya bekor qilingan');
      }
      return this.result(dto.id, {
        create_time: existing.createdAt.getTime(),
        transaction: String(existing.id),
        state: existing.paymeState,
      });
    }

    // Boshqa Payme tranzaksiyasi shu order_id bilan band qilib qo'ymaganini tekshiramiz
    if (payment.providerTransId && payment.providerTransId !== paymeTransId) {
      return this.error(dto.id, PaymeError.COULD_NOT_PERFORM, 'Order band qilingan');
    }

    payment.providerTransId = paymeTransId;
    payment.paymeState = PaymeTransactionState.CREATED;
    payment.rawPayload = { ...dto.params };
    await this.paymentsService.save(payment);

    return this.result(dto.id, {
      create_time: payment.createdAt.getTime(),
      transaction: String(payment.id),
      state: PaymeTransactionState.CREATED,
    });
  }

  private async performTransaction(dto: PaymeRequestDto) {
    const paymeTransId = dto.params.id!;
    const payment = await this.paymentsService.findByProviderTransId(
      PaymentProvider.PAYME,
      paymeTransId,
    );
    if (!payment) {
      return this.error(dto.id, PaymeError.TRANSACTION_NOT_FOUND, 'Tranzaksiya topilmadi');
    }

    if (payment.paymeState === PaymeTransactionState.PERFORMED) {
      // Idempotent: allaqachon to'langan
      return this.result(dto.id, {
        transaction: String(payment.id),
        perform_time: payment.performedAt!.getTime(),
        state: PaymeTransactionState.PERFORMED,
      });
    }

    if (payment.paymeState !== PaymeTransactionState.CREATED) {
      return this.error(dto.id, PaymeError.COULD_NOT_PERFORM, "Holat noto'g'ri");
    }

    payment.paymeState = PaymeTransactionState.PERFORMED;
    await this.paymentsService.markAsPaidAndActivate(payment);

    return this.result(dto.id, {
      transaction: String(payment.id),
      perform_time: payment.performedAt!.getTime(),
      state: PaymeTransactionState.PERFORMED,
    });
  }

  private async cancelTransaction(dto: PaymeRequestDto) {
    const paymeTransId = dto.params.id!;
    const reason = dto.params.reason;

    const payment = await this.paymentsService.findByProviderTransId(
      PaymentProvider.PAYME,
      paymeTransId,
    );
    if (!payment) {
      return this.error(dto.id, PaymeError.TRANSACTION_NOT_FOUND, 'Tranzaksiya topilmadi');
    }

    const newState =
      payment.paymeState === PaymeTransactionState.PERFORMED
        ? PaymeTransactionState.CANCELLED_AFTER_PERFORM
        : PaymeTransactionState.CANCELLED_AFTER_CREATE;

    if (payment.status !== PaymentStatus.CANCELLED) {
      payment.paymeState = newState;
      await this.paymentsService.markAsCancelled(payment, reason);
      // ESLATMA: agar to'lov PAID bo'lgandan keyin bekor qilinsa, obunani qaytarib
      // olish (deactivate) biznes qoidangizga bog'liq — kerak bo'lsa shu yerga qo'shing.
    }

    return this.result(dto.id, {
      transaction: String(payment.id),
      cancel_time: payment.cancelledAt!.getTime(),
      state: newState,
    });
  }

  private async checkTransaction(dto: PaymeRequestDto) {
    const paymeTransId = dto.params.id!;
    const payment = await this.paymentsService.findByProviderTransId(
      PaymentProvider.PAYME,
      paymeTransId,
    );
    if (!payment) {
      return this.error(dto.id, PaymeError.TRANSACTION_NOT_FOUND, 'Tranzaksiya topilmadi');
    }

    return this.result(dto.id, {
      create_time: payment.createdAt.getTime(),
      perform_time: payment.performedAt?.getTime() ?? 0,
      cancel_time: payment.cancelledAt?.getTime() ?? 0,
      transaction: String(payment.id),
      state: payment.paymeState,
      reason: payment.cancelReason ?? null,
    });
  }

  // ===== JSON-RPC javob formatlovchilar =====

  private result(id: number, result: Record<string, any>) {
    return { jsonrpc: '2.0', id, result };
  }

  private error(id: number, code: number, message: string, field?: string) {
    return {
      jsonrpc: '2.0',
      id,
      error: {
        code,
        message: { uz: message, ru: message, en: message },
        ...(field ? { data: field } : {}),
      },
    };
  }
}
