// product.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToOne,
  JoinColumn,
  Unique,
  BeforeInsert,
  BeforeUpdate,
  Index,
  CreateDateColumn
} from 'typeorm';
import { User } from 'src/meta-user/user.entity';
import { Unit } from 'src/units/entities/unit.entity';
import { OrderItem } from 'src/orders/entities/order-item.entity';
import { ProductBatch } from './product-batch.entity';
import { PriceMode } from 'common/enums/priceMode.enum';
import { Statistics } from 'src/statistics/entities/statistic.entity';
// import { Category } from 'src/categories/entities/category.entity';
import { StockFilter } from 'common/enums/product-stock.enum';



@Index('idx_stock_by_user', ['user', 'stock'])
@Entity()
@Unique(['name', 'user'])
@Unique(['barcode', 'user'])
@Unique(['quick_code', 'user'])

export class Product {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;
  

  // ✅ Barcode - scanner uchun (ixtiyoriy)
  @Column({ nullable: true })
  barcode?: string;

  // ✅ Quick code - tez sotish uchun (1, 2, 3, 99, A1, B2 va h.k.)
  // Barcode bo'lmagan mahsulotlar uchun qo'lda kiritiladi
  @Column({ nullable: true, length: 20 })
  quick_code?: string;

  // ✅ Stock ogohlantirish chegarasi
  @Column({
    // nullable: true, 
    type: 'decimal',
    precision: 18, scale: 3,
    default: 0,
    transformer: { to: (value: number) => value, from: (value: number) => Number(value) }
  })
  max_quantity_notification!: number;



  @OneToMany(() => ProductBatch, (batch) => batch.product, {
    cascade: true
  })
  product_batches!: ProductBatch[];





  @Column({
    type: 'decimal',
    precision: 18,
    scale: 3,
    transformer: {
      to: (value: number) => value,
      from: (value: number) => Number(value),


    }
  })
  quantity!: number;



  @Column( {
    type: 'enum',
    enum: StockFilter
  })
  stock: StockFilter = StockFilter.IN_STOCK;


  // // ✅ Qo'shimcha ma'lumot
  // @Column({ nullable: true, length: 500 })
  // description: string;

  // ✅ Mahsulot aktiv/noaktiv
  @Column({ default: true })
  status: boolean = true;

  // ✅ Foydalanuvchi bilan aloqa
  @ManyToOne(() => User, (user) => user.products, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  // ✅ Birlik bilan aloqa
  @ManyToOne(() => Unit, (unit) => unit.products, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'unit_id' })
  unit!: Unit;

  

  // // // ✅ Kategoriya bilan aloqa
  // @ManyToOne(() => Category, { onDelete: 'RESTRICT' })
  // @JoinColumn({ name: 'category_id' })
  // category!: Category;

  // ✅ Savdolar bilan aloqa (chek qatorlari)
  @OneToMany(() => OrderItem, (orderItem) => orderItem.product)
  orderItems?: OrderItem[];




  // ✅ Quick code yoki Barcode orqali qidirish uchun helper
  @BeforeInsert()
  @BeforeUpdate()
  normalizeQuickCode() {
    // Quick code ni uppercase qilish (A1, B2 kabi)
    if (this.quick_code) {
      this.quick_code = this.quick_code.trim().toUpperCase();
    }
  }

  @Column({ type: 'enum', enum: PriceMode, default: PriceMode.UNIFORM })
  pricing_strategy!: PriceMode
  

  @Column( { type: 'decimal', precision: 18, scale: 2, transformer: { to: (value: number) => value, from: (value: number) => Number(value) } })
  selling_price!: number

  @Column( { type: 'decimal', precision: 18, scale: 2, transformer: { to: (value: number) => value, from: (value: number) => Number(value) } })
  purchase_price!: number


  @OneToMany(() => Statistics, (stat) => stat.product)
  statistics!: Statistics[]


  @CreateDateColumn()
  createdAt!: Date







}











