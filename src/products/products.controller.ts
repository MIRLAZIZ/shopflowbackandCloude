import {
  Controller,
  Post,
  Body,
  Req,
  Get,
  Put,
  Param,
  Delete,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { Request } from 'express';
import { ProductsService } from './products.service';
import { Roles } from 'common/decorators/roles.decorator';
import { Role } from 'common/enums/role.enum';
import { CreateProductDto } from './dto/create-product.dto';
import { CreateProductBatchDto } from './dto/products-batch.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CurrentUser } from 'common/decorators/current-user.decarotor';
import { AuthUserPayload, getOwnerId } from 'common/utils/owner.util';
import { SearchProductDto } from './dto/search.dto';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) { }




  // _________________________________Products_______________________________

  /**
   * ✅ Yangi mahsulot yaratish (faqat bitta)
   * Body: { name, barcode?, quick_code?, purchase_price, selling_price, quantity, unit_id, ... }
   */
  @Post()
  @Roles(Role.Client)
  async create(
    @Body() createProductDto: CreateProductDto,
    @CurrentUser() user: AuthUserPayload
  ) {
    return this.productsService.create(createProductDto, getOwnerId(user));
  }



  @Get('search')
  async searchByCode(
    @CurrentUser() user: AuthUserPayload,
    @Query() query: SearchProductDto) 
    {
    return this.productsService.search(getOwnerId(user), query);
  }

  @Get('/lowstock')
  async getLowStock(@CurrentUser() user: AuthUserPayload) {
    return this.productsService.getLowStock(getOwnerId(user));
  }

  /**
   * ✅ Mahsulotni yangilash (narxdan tashqari)
   * Body: { name?, barcode?, quick_code?, quantity?, unit_id?, ... }
   */
  @Put(':id')
  @Roles(Role.Client)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProductDto: UpdateProductDto,
    @CurrentUser() user: AuthUserPayload
  ) {
    return this.productsService.update(id, getOwnerId(user), updateProductDto);
  }

  /**
   * ✅ Mahsulot narxini yangilash
   * Body: { purchase_price?, selling_price? }
  //  */
  @Put(':id/price')
  @Roles(Role.Client)
  async updatePrice(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePriceDto: CreateProductBatchDto,
    @CurrentUser() user: AuthUserPayload
  ) {
    return this.productsService.updateProductBatch(id, getOwnerId(user), updatePriceDto);
  }

  /**
   * ✅ Barcha mahsulotlarni olish (narx bilan)
   */
  @Get()
  findAll(
    @CurrentUser() user: AuthUserPayload,
    @Query('page', ParseIntPipe) page: number
  ) {
    return this.productsService.findAll(getOwnerId(user), page);
  }

  /**
   * ✅ Quick code yoki barcode orqali qidirish (KASSA UCHUN)
   * GET /products/search?code=A1
   * GET /products/search?code=4780000135063
   */


  /**
   * ✅ Bitta mahsulotni olish (narx tarixi bilan)
   */
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUserPayload) {
    return this.productsService.findOne(id, getOwnerId(user));
  }

 
  
 
  /**
   * ✅ Mahsulotni o'chirish
   * Buyurtma (chek)da ishtirok etgan bo'lsa o'chirilmaydi
   */
  @Delete(':id')
  @Roles(Role.Client)
  async remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUserPayload) {
    return this.productsService.delete(id, getOwnerId(user));
  }





  // _______________________Batches________________________________



    @Post('batch')
  @Roles(Role.Client)
  async createProductBatch(@CurrentUser() user: AuthUserPayload, @Body() newPriceHistory: CreateProductBatchDto) {
    return this.productsService.createProductBatch(newPriceHistory, getOwnerId(user));
  }

  //update product batch

  @Put('batch/:id')
  async updateBatch(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProductBatchDto: CreateProductBatchDto,
    @CurrentUser() user: AuthUserPayload
  ) {
    return this.productsService.updateProductBatch(id, getOwnerId(user), updateProductBatchDto);
  }



   @Get(':id/batches')
  getProductBatches(@CurrentUser() user: AuthUserPayload,@Param('id', ParseIntPipe) id: number,  @Query('page', ParseIntPipe) page: number = 1) {
    return this.productsService.getProductBatches(getOwnerId(user), id, page);
  }



    @Delete('batch/delete/:id')
  @Roles(Role.Client)
  @Roles(Role.Client)
  async removeProductBatch(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUserPayload) {
    return this.productsService.deleteProductBatch(id, getOwnerId(user));
  }


 /**
   * ✅ Mahsulot narx tarixini olish
   */
  @Get('batch/:id')
  getProductBatch(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUserPayload) {
    return this.productsService.getProductBatch(id, getOwnerId(user));
  }





}