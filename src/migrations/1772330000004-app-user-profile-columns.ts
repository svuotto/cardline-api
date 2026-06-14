import { MigrationInterface, QueryRunner } from "typeorm";

export class AppUserProfileColumns1772330000004 implements MigrationInterface {
  name = "AppUserProfileColumns1772330000004";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE EXTENSION IF NOT EXISTS pgcrypto;

      ALTER TABLE app_user
        ALTER COLUMN user_birth_date DROP NOT NULL;

      ALTER TABLE app_user
        ADD COLUMN IF NOT EXISTS username text NULL,
        ADD COLUMN IF NOT EXISTS username_changed_at timestamptz NULL,
        ADD COLUMN IF NOT EXISTS user_locked_at timestamptz NULL,
        ADD COLUMN IF NOT EXISTS user_locked_until timestamptz NULL,
        ADD COLUMN IF NOT EXISTS pending_new_email citext NULL,
        ADD COLUMN IF NOT EXISTS pending_new_email_verified_at timestamptz NULL,
        ADD COLUMN IF NOT EXISTS email_change_finalizes_at timestamptz NULL,
        ADD COLUMN IF NOT EXISTS email_change_revoked_at timestamptz NULL,
        ADD COLUMN IF NOT EXISTS google_sub text NULL,
        ADD COLUMN IF NOT EXISTS subscription_tier text NOT NULL DEFAULT 'free',
        ADD COLUMN IF NOT EXISTS subscription_expires_at timestamptz NULL,
        ADD COLUMN IF NOT EXISTS subscription_provider text NOT NULL DEFAULT 'none',
        ADD COLUMN IF NOT EXISTS app_account_token uuid NULL;

      CREATE UNIQUE INDEX IF NOT EXISTS ux_app_user_username
        ON app_user(username)
        WHERE username IS NOT NULL;

      CREATE UNIQUE INDEX IF NOT EXISTS ux_app_user_google_sub
        ON app_user(google_sub)
        WHERE google_sub IS NOT NULL;

      CREATE UNIQUE INDEX IF NOT EXISTS ux_app_user_app_account_token
        ON app_user(app_account_token)
        WHERE app_account_token IS NOT NULL;

      UPDATE app_user
      SET app_account_token = gen_random_uuid()
      WHERE app_account_token IS NULL;

      ALTER TABLE app_user
        ALTER COLUMN app_account_token SET NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS ux_app_user_app_account_token;
      DROP INDEX IF EXISTS ux_app_user_google_sub;
      DROP INDEX IF EXISTS ux_app_user_username;

      ALTER TABLE app_user
        DROP COLUMN IF EXISTS app_account_token,
        DROP COLUMN IF EXISTS subscription_provider,
        DROP COLUMN IF EXISTS subscription_expires_at,
        DROP COLUMN IF EXISTS subscription_tier,
        DROP COLUMN IF EXISTS google_sub,
        DROP COLUMN IF EXISTS email_change_revoked_at,
        DROP COLUMN IF EXISTS email_change_finalizes_at,
        DROP COLUMN IF EXISTS pending_new_email_verified_at,
        DROP COLUMN IF EXISTS pending_new_email,
        DROP COLUMN IF EXISTS user_locked_until,
        DROP COLUMN IF EXISTS user_locked_at,
        DROP COLUMN IF EXISTS username_changed_at,
        DROP COLUMN IF EXISTS username;
    `);
  }
}
