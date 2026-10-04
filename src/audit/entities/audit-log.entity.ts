import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum AuditAction {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  CANCEL = 'cancel',
  RETURN = 'return',
  PAYMENT = 'payment',
  LOGIN = 'login',
}

// Kim, qachon, nimani o'zgartirgani haqida kuzatuv jurnali. Do'kon egasi
// (ownerId) bo'yicha ajratiladi, shunda bir nechta xodim ishlasa ham har
// kim faqat o'z do'konining jurnalini ko'radi.
@Entity({ name: 'audit_logs' })
@Index('idx_audit_owner_created', ['ownerId', 'createdAt'])
@Index('idx_audit_entity', ['entityType', 'entityId'])
export class AuditLog {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'owner_id' })
  ownerId!: number;

  // Amalni bajargan xodim (owner, cashier va h.k.)
  @Column({ name: 'user_id' })
  userId!: number;

  // Username ko'chirib saqlanadi — kelajakda user o'chirilsa/nomi
  // o'zgarsa ham jurnal o'qilishi buzilmasligi uchun
  @Column({ name: 'user_name', nullable: true })
  userName!: string | null;

  @Column({ type: 'enum', enum: AuditAction })
  action!: AuditAction;

  // 'Product' | 'ProductBatch' | 'Order' | 'Customer' | 'Debt' va h.k.
  @Column({ name: 'entity_type' })
  entityType!: string;

  @Column({ name: 'entity_id', type: 'int', nullable: true })
  entityId!: number | null;

  // Inson o'qiydigan nom (masalan mahsulot nomi, chek raqami)
  @Column({ name: 'entity_label', nullable: true })
  entityLabel!: string | null;

  // UPDATE amali uchun: { fieldName: { old, new } }
  @Column({ type: 'json', nullable: true })
  changes!: Record<string, { old: any; new: any }> | null;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @CreateDateColumn()
  createdAt!: Date;
}
