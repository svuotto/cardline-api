import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CardsController } from './cards.controller';
import { CardsService } from './cards.service';
import { CardCore } from './card-core.entity';
import { CardLocalization } from './card-localization.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CardCore, CardLocalization])],
  controllers: [CardsController],
  providers: [CardsService],
})
export class CardsModule {}

