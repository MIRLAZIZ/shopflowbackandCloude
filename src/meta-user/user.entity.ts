import { Exclude, Expose } from 'class-transformer';
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, OneToMany, ManyToOne } from 'typeorm';
import { Product } from 'src/products/entities/product.entity';
// import { Category } from 'src/categories/entities/category.entity';
import { Unit } from 'src/units/entities/unit.entity';
import { Order } from 'src/orders/entities/order.entity';
import { Role } from 'common/enums/role.enum';
import { SubscriptionStatus } from 'common/enums/subscription-status.enum';
import { Statistics } from 'src/statistics/entities/statistic.entity';

@Entity()
@Exclude()
export class User {
  @Expose()
  @PrimaryGeneratedColumn()
  id!: number;

  @Expose()
  @Column({ nullable: false })
  fullName!: string;

  @Expose()
  @Column({ nullable: false, unique: true })
  username!: string;

  @Column({ nullable: false })
  password!: string;

  @Expose()
  @Column({ nullable: true })
  brandName!: string;

  @Expose()
  @Column({
    type: 'enum',
    enum: Role,
  })
  role!: Role;

  @Expose()
  @CreateDateColumn()
  createdAt!: Date;

  // ===== SUBSCRIPTION FIELDLARI =====

  @Expose()
  @Column({
    type: 'enum',
    enum: SubscriptionStatus,
    default: SubscriptionStatus.TRIAL,
  })
  subscriptionStatus!: SubscriptionStatus;

  @Expose()
  @Column({ type: 'datetime' })
  expiryDate!: Date;

  @Expose()
  @Column({ type: 'timestamp', nullable: true })
  lastPaymentAt!: Date | null;

  @Expose()
  @Column({ default: 0 })
  manualExtensionCount!: number;

  @Expose()
  @Column({ type: 'text', nullable: true })
  adminNote!: string | null;


  
  // ===================================

  @Expose()
  @Column({ nullable: true })
  phone!: string;

  @Expose()
  @Column({ nullable: true })
  telegramId!: number;

  @Expose()
  @Column({ nullable: true })
  telegramGroupId!: string;

 

  @Expose()
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  balance!: number;

  // ✅ Product bilan OneToMany bog'lanish
  @OneToMany(() => Product, (product) => product.user)
  products!: Product[];

  // @OneToMany(() => Category, (category) => category.user)
  // categories!: Category[];

  @OneToMany(() => Unit, (unit) => unit.user)
  units!: Unit[];

  // Foydalanuvchi bevosita amalga oshirgan cheklar (kassir bo'lsa ham shu yerda)
  @OneToMany(() => Order, (order) => order.user)
  orders!: Order[];

  // Hodimni kim yaratgan (do'kon egasi)
  @ManyToOne(() => User, (user) => user.employees, { nullable: true })
  createdBy!: User | null;

  // Do'kon egasiga tegishli hodimlar
  @OneToMany(() => User, (user) => user.createdBy)
  employees!: User[];

  @OneToMany(() => Statistics, (statistic) => statistic.user)
  statistics!: Statistics[];
  
}



