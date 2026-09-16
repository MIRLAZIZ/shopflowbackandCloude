import { Column, Entity, PrimaryGeneratedColumn, OneToMany, JoinColumn, ManyToOne, Unique } from "typeorm";
import { Product } from "src/products/entities/product.entity";
import { User } from "src/meta-user/user.entity";
@Entity({name: 'unit'} )
@Unique(['name', 'user'])
@Unique(['label', 'user'])
export class Unit {
    @PrimaryGeneratedColumn()
    id: number
    @Column()
    name: string

    @Column()
    label: string

    
 // ✅ Bu joy muhim — Product bilan bog‘lanish
  @OneToMany(() => Product, (product) => product.unit)
  products: Product[];
@ManyToOne(()=> User, (user) => user.units, {onDelete:"CASCADE"})
@JoinColumn({name: 'userId'})
user: User  
    
}
