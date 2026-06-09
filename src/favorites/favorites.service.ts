import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { FavoriteEntity } from "./favorites.entity";

@Injectable()
export class FavoritesService {
  constructor(
    @InjectRepository(FavoriteEntity)
    private readonly repo: Repository<FavoriteEntity>,
  ) {}

  async list(userUid: string) {
    const rows = await this.repo.find({
      where: { userUid },
      order: { createdAt: "DESC" },
    });

    return rows.map((r) => ({
      cardCoreUid: r.cardCoreUid,
    }));
  }

  async add(userUid: string, cardCoreUid: string) {
    const existing = await this.repo.findOne({
      where: { userUid, cardCoreUid },
    });

    if (!existing) {
      const row = this.repo.create({
        userUid,
        cardCoreUid,
        createdAt: new Date(),
      });
      await this.repo.save(row);
    }

    return { ok: true };
  }

  async remove(userUid: string, cardCoreUid: string) {
    await this.repo.delete({ userUid, cardCoreUid });
    return { ok: true };
  }
}