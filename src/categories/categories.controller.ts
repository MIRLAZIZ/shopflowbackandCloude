import { Controller, Get, Post, Body, Patch, Param, Delete, Put, Req } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) { }

//   @Post()
//   create(@Body() createCategoryDto: CreateCategoryDto, @Req() req) {
//     console.log(req['user'].id);
    
//     return this.categoriesService.create(createCategoryDto, req['user'].id);
//   }

// @Get()
// async findAll(@Req() req) {
//   return this.categoriesService.findAll(req['user'].id);
// }

//   @Get(':id')
//   findOne(@Param('id') id: string) {
//     return this.categoriesService.findOne(+id);
//   }

//   @Put(':id')
//   update(@Param('id') id: string, @Body() updateData: CreateCategoryDto) {
//     return this.categoriesService.update(+id, updateData);
//   }

//   @Delete(':id')
//   remove(@Param('id') id: string) {
//     return this.categoriesService.remove(+id);
//   }
}
