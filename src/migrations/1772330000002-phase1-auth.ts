import { MigrationInterface, QueryRunner } from "typeorm";

export class FixUserUidDefault1772330000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE EXTENSION IF NOT EXISTS pgcrypto;

      -- app_user: DB soll UUID generieren
      ALTER TABLE app_user
        ALTER COLUMN user_uid SET DEFAULT gen_random_uuid();

      -- optional aber empfohlen: auch Session/Token-UIDs automatisch
      ALTER TABLE email_verification_token
        ALTER COLUMN token_uid SET DEFAULT gen_random_uuid();

      ALTER TABLE auth_session
        ALTER COLUMN session_uid SET DEFAULT gen_random_uuid();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE auth_session
        ALTER COLUMN session_uid DROP DEFAULT;

      ALTER TABLE email_verification_token
        ALTER COLUMN token_uid DROP DEFAULT;

      ALTER TABLE app_user
        ALTER COLUMN user_uid DROP DEFAULT;
    `);
  }
}