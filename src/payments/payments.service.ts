import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Payment } from './entities/payment.entity';
import { PaymentProvider } from './enums/payment-provider.enum';
import { PaymentStatus } from './enums/payment-status.enum';
import { UserService } from 'src/meta-user/user.service'; // loyihangizdagi haqiqiy yo'lga moslang

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    private readonly usersService: UserService,
    private readonly configService: ConfigService,
  ) {}

  get subscriptionPrice(): number {
    return this.configService.get<number>('payment.subscriptionPrice')!;
  }

  /**
   * Berilgan merchantTransId bo'yicha mavjud to'lovni topadi (idempotentlik uchun).
   */
  async findByMerchantTransId(merchantTransId: string): Promise<Payment | null> {
    return this.paymentRepository.findOne({ where: { merchantTransId } });
  }

  async findByProviderTransId(
    provider: PaymentProvider,
    providerTransId: string,
  ): Promise<Payment | null> {
    return this.paymentRepository.findOne({ where: { provider, providerTransId } });
  }

  async findById(id: number): Promise<Payment | null> {
    return this.paymentRepository.findOne({ where: { id } });
  }

  /**
   * Yangi "kutilayotgan" to'lov yozuvini yaratadi (Click: Prepare, Payme: CreateTransaction bosqichida).
   */
  async createPending(params: {
    provider: PaymentProvider;
    userId: number;
    merchantTransId: string;
    amount: number;
    providerTransId?: string;
    rawPayload?: Record<string, any>;
  }): Promise<Payment> {
    const payment = this.paymentRepository.create({
      provider: params.provider,
      userId: params.userId,
      merchantTransId: params.merchantTransId,
      amount: params.amount,
      providerTransId: params.providerTransId ?? null,
      status: PaymentStatus.CREATED,
      rawPayload: params.rawPayload ?? null,
    });
    return this.paymentRepository.save(payment);
  }

  async save(payment: Payment): Promise<Payment> {
    return this.paymentRepository.save(payment);
  }

  /**
   * To'lov muvaffaqiyatli yakunlanganda chaqiriladi.
   * Idempotent: agar bu to'lov allaqachon PAID bo'lsa, subscriptionni qayta uzaytirmaydi.
   */
  async markAsPaidAndActivate(payment: Payment): Promise<Payment> {
    if (payment.status === PaymentStatus.PAID) {
      this.logger.warn(`Payment #${payment.id} already PAID, skipping re-activation`);
      return payment;
    }

    payment.status = PaymentStatus.PAID;
    payment.performedAt = new Date();
    await this.paymentRepository.save(payment);

    await this.usersService.activateSubscription(payment.userId);

    this.logger.log(
      `Payment #${payment.id} (${payment.provider}) faollashtirildi, userId=${payment.userId}`,
    );

    return payment;
  }

  async markAsCancelled(payment: Payment, reason?: number): Promise<Payment> {
    payment.status = PaymentStatus.CANCELLED;
    payment.cancelledAt = new Date();
    payment.cancelReason = reason ?? null;
    return this.paymentRepository.save(payment);
  }
}
