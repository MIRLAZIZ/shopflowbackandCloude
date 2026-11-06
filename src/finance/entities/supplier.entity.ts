import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index, Unique } from 'typeorm';

// Yetkazib beruvchi (mahsulotni sotib oladigan firma/odam)
@Entity({ name: 'suppliers' })
@Index('idx_suppliers_owner', ['ownerId'])
@Unique('uq_supplier_owner_name', ['ownerId', 'name'])
export class Supplier {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'owner_id' })
  ownerId!: number;

  @Column({ type: 'varchar', length: 150 })
  name!: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  phone!: string | null;

  @Column({ type: 'text', nullable: true })
  note!: string | null;

  @CreateDateColumn()
  createdAt!: Date;
}
