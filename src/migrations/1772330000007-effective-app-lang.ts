import { MigrationInterface, QueryRunner } from "typeorm";

export class EffectiveAppLang1772330000007 implements MigrationInterface {
  name = "EffectiveAppLang1772330000007";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE app_user
        ADD COLUMN IF NOT EXISTS user_effective_app_lang text NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE app_user
        DROP COLUMN IF EXISTS user_effective_app_lang;
    `);
  }
}
