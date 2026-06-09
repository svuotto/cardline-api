import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectDataSource, InjectRepository } from "@nestjs/typeorm";
import { DataSource, EntityManager, Repository } from "typeorm";
import { AppUserEntity } from "./user.entity";
import { AppUserDeletedEntity } from "./user-deleted.entity";

/** Tables that may be absent on older DBs until migrations are applied. */
const OPTIONAL_USER_TABLES = new Set(["user_feedback"]);

@Injectable()
export class AccountDeletionService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,

    @InjectRepository(AppUserEntity)
    private readonly userRepo: Repository<AppUserEntity>,

    @InjectRepository(AppUserDeletedEntity)
    private readonly deletedRepo: Repository<AppUserDeletedEntity>,
  ) {}

  async purgeAccount(userUid: string) {
    const user = await this.userRepo.findOne({ where: { userUid } });
    if (!user) {
      throw new NotFoundException("User not found");
    }

    await this.dataSource.transaction(async (manager) => {
      const params = [userUid];

      await manager.query(
        `
        DELETE FROM deck_card
        WHERE deck_game_uid IN (
          SELECT deck_game_uid FROM deck_game WHERE user_uid = $1
        )
        `,
        params,
      );

      const tables = [
        "deck_game",
        "favorite_card",
        "inventory_card",
        "user_device_binding",
        "user_notification",
        "user_notification_preference",
        "user_push_token",
        "user_subscription",
        "user_feedback",
        "auth_session",
        "email_verification_token",
        "email_change_revoke_token",
        "auth_recovery_attempt",
      ];

      for (const table of tables) {
        if (OPTIONAL_USER_TABLES.has(table)) {
          const exists = await this.tableExists(manager, table);
          if (!exists) continue;
        }

        await manager.query(
          `DELETE FROM ${table} WHERE user_uid = $1`,
          params,
        );
      }

      await manager.save(AppUserDeletedEntity, {
        userUid,
        deletedAt: new Date(),
      });

      await manager.delete(AppUserEntity, { userUid });
    });

    return { ok: true };
  }

  private async tableExists(manager: EntityManager, table: string): Promise<boolean> {
    const rows: Array<{ exists: boolean }> = await manager.query(
      `SELECT to_regclass($1) IS NOT NULL AS "exists"`,
      [`public.${table}`],
    );
    return Boolean(rows[0]?.exists);
  }
}
