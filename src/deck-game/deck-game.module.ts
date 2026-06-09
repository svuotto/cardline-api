import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DeckGameController } from "./deck-game.controller";
import { DeckGameService } from "./deck-game.service";
import { DeckGameEntity } from "./deck-game.entity";
import { DeckCardEntity } from "./deck-card.entity";
import { DeckNameBlocklistService } from "./deck-name-blocklist.service";
import { CommonModule } from "../common/common.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([DeckGameEntity, DeckCardEntity]),
    CommonModule,
  ],
  controllers: [DeckGameController],
  providers: [
    DeckGameService,
    DeckNameBlocklistService,
  ],
  exports: [DeckGameService],
})
export class DeckGameModule {}