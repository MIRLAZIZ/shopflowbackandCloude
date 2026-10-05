import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { InventoryCountItem } from './inventory-count-item.entity';
import { InventoryStatus } from 'common/enums/inventory-status.enum';

// Bitta inventarizatsiya sessiyasi — "bugun do'konda tovar hisobini
// tekshiramiz" degan bitta voqea. Ichida har bir partiya (batch) uchun
// alohida InventoryCountItem bo'ladi.
@Entity({ name: 'inventory_sessions' })
@Index('idx_inventory_owner_status', ['ownerId', 'status'])
export class InventorySession {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'owner_id' })
  ownerId!: number;

  @Column({ type: 'enum', enum: InventoryStatus, default: InventoryStatus.OPEN })
  status!: InventoryStatus;

  @Column({ name: 'started_by' })
  startedBy!: number;

  @Column({ name: 'completed_by', type: 'int', nullable: true })
  completedBy!: number | null;

  @Column({ type: 'timestamp', nullable: true })
  completedAt!: Date | null;

  @Column({ type: 'text', nullable: true })
  note!: string | null;

  @OneToMany(() => InventoryCountItem, item => item.session, { cascade: true })
  items!: InventoryCountItem[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
