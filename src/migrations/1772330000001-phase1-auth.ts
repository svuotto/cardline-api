import { MigrationInterface, QueryRunner } from "typeorm";

export class Phase1Auth1772330000001 implements MigrationInterface {
  name = "Phase1Auth1772330000001";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      -- UUID generator
      CREATE EXTENSION IF NOT EXISTS pgcrypto;

      -- Email verification tokens (one-time)
      CREATE TABLE IF NOT EXISTS email_verification_token (
        token_uid            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_uid             uuid NOT NULL REFERENCES app_user(user_uid) ON DELETE CASCADE,
        token_hash           text NOT NULL,
        expires_at           timestamptz NOT NULL,
        created_at           timestamptz NOT NULL,
        used_at              timestamptz NULL
      );

      CREATE INDEX IF NOT EXISTS ix_evt_user
        ON email_verification_token(user_uid);

      CREATE UNIQUE INDEX IF NOT EXISTS ux_evt_token_hash
        ON email_verification_token(token_hash);

      -- Sessions (refresh tokens per device)
      CREATE TABLE IF NOT EXISTS auth_session (
        session_uid          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_uid             uuid NOT NULL REFERENCES app_user(user_uid) ON DELETE CASCADE,
        refresh_token_hash   text NOT NULL,
        device_label         text NULL,
        user_agent           text NULL,
        ip                   text NULL,
        created_at           timestamptz NOT NULL,
        last_seen_at         timestamptz NOT NULL,
        revoked_at           timestamptz NULL,
        expires_at           timestamptz NOT NULL
      );

      CREATE INDEX IF NOT EXISTS ix_auth_session_user
        ON auth_session(user_uid);

      CREATE UNIQUE INDEX IF NOT EXISTS ux_auth_session_refresh_hash
        ON auth_session(refresh_token_hash);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS auth_session CASCADE;
      DROP TABLE IF EXISTS email_verification_token CASCADE;
    `);
  }
}