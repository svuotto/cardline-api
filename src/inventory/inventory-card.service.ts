import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { InventoryCardEntity } from "./inventory-card.entity";
import { UpsertInventoryCardDto } from "./inventory-card.dto";

@Injectable()
export class InventoryCardService {
  constructor(
    @InjectRepository(InventoryCardEntity)
    private readonly repo: Repository<InventoryCardEntity>,
  ) {}

  async getAllForUser(userUid: string) {
    return this.repo.find({
      where: { userUid },
      order: { updatedAt: "DESC" },
    });
  }

  async upsertForUser(userUid: string, dto: UpsertInventoryCardDto) {
    const existing = await this.repo.findOne({
      where: {
        userUid,
        cardCoreUid: dto.cardCoreUid,
        lang: dto.lang,
      },
    });

    if (dto.quantity === 0) {
      if (existing) {
        await this.repo.remove(existing);
      }
      return null;
    }

    if (existing) {
      existing.quantity = dto.quantity;
      return this.repo.save(existing);
    }

    const created = this.repo.create({
      userUid,
      cardCoreUid: dto.cardCoreUid,
      lang: dto.lang,
      quantity: dto.quantity,
    });

    return this.repo.save(created);
  }
}