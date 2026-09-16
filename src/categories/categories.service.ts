import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Category } from './entities/category.entity';
import { Repository, UpdateResult } from 'typeorm';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>
  ) { }



//    async create(data: CreateCategoryDto, userId:number): Promise<Category> {

//      const category = this.categoryRepository.create({
//     ...data,
//     user:{id:userId}
//   });
//   return await this.categoryRepository.save(category);
//   }

// // categories.service.ts
// async findAll(id:number) {
//   // console.log(id, 'bu user id');
  
//   return this.categoryRepository.find({
//     where: { user: { id: id } },


  
//   }); 
  
// }

//   findOne(id: number): Promise<Category | null> {
//     return this.categoryRepository.findOne({ where: { id } });
//   }

//   async update(id: number, updateData: CreateCategoryDto): Promise<{ message: string; affected: number }> {
//     const result = await this.categoryRepository.update(id, updateData);

//      if (!result.affected) {
//     throw new NotFoundException('Category not found');
//   }
//     return {
//       message: 'Category muvaffaqiyatli yangilandi',
//       affected: result.affected
//     }
//   }

 
//   async remove(id: number) {
//   const result = await this.categoryRepository
//     .delete(id)
//     .catch((error) => {
//       if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.code === '23503') {
//         throw new BadRequestException('Bu categoriyani o‘chirish mumkin emas. Unga tegishli productlar mavjud.');
//       }
//       throw error;
//     });

//   if (result.affected === 0) { 
//     throw new NotFoundException('Category topilmadi');
//   }

//   return {message: 'Category muvaffaqiyatli o\'chirildi', affected: result.affected};
// }


}
