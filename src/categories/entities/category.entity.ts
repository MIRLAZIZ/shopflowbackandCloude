// import { User } from "src/meta-user/user.entity";
import { Column, Entity, JoinColumn, ManyToMany, ManyToOne, PrimaryGeneratedColumn, Unique } from "typeorm";

@Entity('categories')
// @Unique(['name', 'user'])
export class Category {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column()
    name!: string;


    // //har bir categoriya bitta userg tegishli
    // @ManyToOne(() => User, (user) => user.categories, { onDelete: "CASCADE" })
    // @JoinColumn({ name: 'userId' })
    // user: User


 

}



