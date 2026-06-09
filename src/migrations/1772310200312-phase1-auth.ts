import { MigrationInterface, QueryRunner } from "typeorm";

export class Phase1User1772310200312 implements MigrationInterface {
  name = "Phase1User1772310200312";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS citext;`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS app_user (
        user_uid                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_first_name          text NOT NULL,
        user_last_name           text NOT NULL,
        user_birth_date          date NULL,
        user_email               citext NOT NULL,
        user_status              text NOT NULL,
        user_email_verified_at   timestamptz NULL,
        user_preferred_app_lang  text NULL,
        user_preferred_card_lang text NOT NULL,
        user_created_at          timestamptz NOT NULL
      );

      CREATE UNIQUE INDEX IF NOT EXISTS ux_app_user_email ON app_user(user_email);

      CREATE TABLE IF NOT EXISTS app_user_deleted (
        user_uid    uuid PRIMARY KEY,
        deleted_at  timestamptz NOT NULL
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS app_user_deleted;
      DROP TABLE IF EXISTS app_user;
    `);
  }
}
