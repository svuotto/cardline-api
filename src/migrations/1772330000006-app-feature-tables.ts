import { MigrationInterface, QueryRunner } from "typeorm";

export class AppFeatureTables1772330000006 implements MigrationInterface {
  name = "AppFeatureTables1772330000006";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE EXTENSION IF NOT EXISTS pgcrypto;

      CREATE TABLE IF NOT EXISTS deck_game (
        deck_game_uid text PRIMARY KEY,
        user_uid text NULL,
        deck_game_name text NOT NULL,
        deck_game_format text NULL,
        deck_game_language_code text NOT NULL,
        leader_card_localization_uid text NULL,
        deck_game_source_type text NOT NULL DEFAULT 'user',
        deck_game_is_public boolean NOT NULL DEFAULT false,
        deck_game_is_highlighted boolean NOT NULL DEFAULT false,
        deck_game_created_at timestamptz NOT NULL DEFAULT now(),
        deck_game_updated_at timestamptz NOT NULL DEFAULT now(),
        deck_game_removed_at timestamptz NULL
      );

      CREATE INDEX IF NOT EXISTS ix_deck_game_user
        ON deck_game(user_uid)
        WHERE deck_game_removed_at IS NULL;

      CREATE TABLE IF NOT EXISTS deck_card (
        deck_card_uid text PRIMARY KEY,
        deck_game_uid text NOT NULL,
        card_localization_uid text NOT NULL,
        deck_card_section text NOT NULL,
        deck_card_quantity int NOT NULL DEFAULT 1,
        deck_card_limit int NOT NULL DEFAULT 4,
        deck_card_position_int int NOT NULL DEFAULT 0,
        deck_card_added_at timestamptz NOT NULL DEFAULT now(),
        deck_card_updated_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS ix_deck_card_deck_game
        ON deck_card(deck_game_uid);

      CREATE TABLE IF NOT EXISTS inventory_card (
        inventory_uid uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_uid uuid NOT NULL,
        card_core_uid varchar(100) NOT NULL,
        lang varchar(16) NOT NULL,
        quantity int NOT NULL,
        added_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE UNIQUE INDEX IF NOT EXISTS ux_inventory_card_user_core_lang
        ON inventory_card(user_uid, card_core_uid, lang);

      CREATE TABLE IF NOT EXISTS favorite_card (
        favorite_uid uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_uid uuid NOT NULL REFERENCES app_user(user_uid) ON DELETE CASCADE,
        card_core_uid text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE UNIQUE INDEX IF NOT EXISTS ux_favorite_card_user_card_core_uid
        ON favorite_card(user_uid, card_core_uid);

      CREATE TABLE IF NOT EXISTS user_device_binding (
        user_device_binding_uid uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_uid uuid NOT NULL REFERENCES app_user(user_uid) ON DELETE CASCADE,
        device_id text NOT NULL,
        secret_hash text NOT NULL,
        device_label text NULL,
        platform text NOT NULL DEFAULT 'ios',
        biometric_protected boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        last_seen_at timestamptz NOT NULL DEFAULT now(),
        revoked_at timestamptz NULL
      );

      CREATE UNIQUE INDEX IF NOT EXISTS ux_user_device_binding_user_device_active
        ON user_device_binding(user_uid, device_id)
        WHERE revoked_at IS NULL;

      CREATE TABLE IF NOT EXISTS auth_recovery_attempt (
        auth_recovery_attempt_uid uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        username text NOT NULL,
        user_uid uuid NULL,
        device_id text NULL,
        ip text NULL,
        user_agent text NULL,
        success boolean NOT NULL DEFAULT false,
        failure_reason text NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS ix_auth_recovery_attempt_username
        ON auth_recovery_attempt(username, created_at DESC);

      CREATE TABLE IF NOT EXISTS email_change_revoke_token (
        email_change_revoke_token_uid uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_uid uuid NOT NULL REFERENCES app_user(user_uid) ON DELETE CASCADE,
        token_hash text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        expires_at timestamptz NOT NULL,
        used_at timestamptz NULL
      );

      CREATE UNIQUE INDEX IF NOT EXISTS ux_email_change_revoke_token_hash
        ON email_change_revoke_token(token_hash);

      CREATE TABLE IF NOT EXISTS user_subscription (
        user_subscription_uid uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_uid uuid NOT NULL REFERENCES app_user(user_uid) ON DELETE CASCADE,
        provider text NOT NULL,
        provider_original_transaction_id text NULL,
        provider_transaction_id text NULL,
        tier text NOT NULL,
        starts_at timestamptz NOT NULL,
        expires_at timestamptz NOT NULL,
        auto_renews boolean NOT NULL DEFAULT false,
        status text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        app_account_token uuid NULL
      );

      CREATE INDEX IF NOT EXISTS ix_user_subscription_user
        ON user_subscription(user_uid);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS user_subscription CASCADE;
      DROP TABLE IF EXISTS email_change_revoke_token CASCADE;
      DROP TABLE IF EXISTS auth_recovery_attempt CASCADE;
      DROP TABLE IF EXISTS user_device_binding CASCADE;
      DROP TABLE IF EXISTS favorite_card CASCADE;
      DROP TABLE IF EXISTS inventory_card CASCADE;
      DROP TABLE IF EXISTS deck_card CASCADE;
      DROP TABLE IF EXISTS deck_game CASCADE;
    `);
  }
}
