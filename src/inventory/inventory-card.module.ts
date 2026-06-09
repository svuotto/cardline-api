import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { InventoryCardEntity } from "./inventory-card.entity";
import { InventoryCardController } from "./inventory-card.controller";
import { InventoryCardService } from "./inventory-card.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([InventoryCardEntity]),
  ],
  controllers: [InventoryCardController],
  providers: [InventoryCardService],
  exports: [InventoryCardService],
})
export class InventoryCardModule {}