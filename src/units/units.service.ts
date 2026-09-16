import { BadRequestException, Injectable, ConflictException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';
import { Unit } from './entities/unit.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { DeleteResult, Not, Repository, UpdateResult } from 'typeorm';
import { Product } from 'src/products/entities/product.entity';

@Injectable()
export class UnitsService {
  constructor(

    @InjectRepository(Unit)
    private unitRepository: Repository<Unit>,

    @InjectRepository(Product)
  private productRepository: Repository<Product>  ) {

  }
  async create(createUnitDto: CreateUnitDto, userId: number): Promise<Unit> {
    try {
      const unit = this.unitRepository.create({
        ...createUnitDto,
        user: { id: userId },
      });

      return await this.unitRepository.save(unit);
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        throw new ConflictException('Bu nomdagi unit allaqachon mavjud!');
      }

      throw new InternalServerErrorException('unitni saqlashda xatolik yuz berdi');



    }
  }


  async findAll(userId): Promise<Unit[]> {
    return await this.unitRepository.find({
      where: { user: { id: userId } },
      order: { id: 'DESC' },
    })
      ;
  }

  async findOne(id: number): Promise<Unit> {
    const unit = await this.unitRepository.findOne({ where: { id } });
    if (!unit) {
      throw new BadRequestException('id not found')
    }
    return unit;
  }

  async update(id: number, createUnitDto: UpdateUnitDto): Promise<UpdateResult> {


    try {
      const unit = await this.unitRepository.findOne({ where: { id } })
      if (!unit) {
        throw new NotFoundException('Unit topilmadi')
      }
       const  result = await this.unitRepository.update(id, createUnitDto)

      return result
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        throw new ConflictException('Bu nomdagi unit allaqachon mavjud!');
      }

      throw new InternalServerErrorException('unitni saqlashda xatolik yuz berdi');
    }
  }


async remove(id: number): Promise<void> {
  const unit = await this.unitRepository.findOne({ where: { id } })

  if (!unit) {
    throw new NotFoundException('Unit topilmadi')
  }

  const count = await this.productRepository.count({
    where: { unit: { id } }
  })

  if (count > 0) {
    throw new BadRequestException(
      'Bu unit productlarda ishlatilgan, o‘chirib bo‘lmaydi'
    )
  }

  await this.unitRepository.delete(id)
}
}
