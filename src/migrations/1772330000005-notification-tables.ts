import { MigrationInterface, QueryRunner } from "typeorm";

export class NotificationTables1772330000005 implements MigrationInterface {
  name = "NotificationTables1772330000005";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS user_notification_preference (
        user_uid uuid PRIMARY KEY,
        notify_new_products boolean NOT NULL DEFAULT true,
        notify_tier_decks boolean NOT NULL DEFAULT true
      );

      ALTER TABLE user_notification_preference
        DROP CONSTRAINT IF EXISTS fk_user_notification_preference_user;

      ALTER TABLE user_notification_preference
        ADD CONSTRAINT fk_user_notification_preference_user
        FOREIGN KEY (user_uid) REFERENCES app_user(user_uid) ON DELETE CASCADE;

      CREATE TABLE IF NOT EXISTS user_push_token (
        user_push_token_uid text PRIMARY KEY,
        user_uid text NOT NULL,
        device_id text NULL,
        platform text NOT NULL,
        push_token text NOT NULL,
        push_enabled boolean NOT NULL DEFAULT true,
        push_token_created_at timestamptz NOT NULL DEFAULT now(),
        push_token_updated_at timestamptz NOT NULL DEFAULT now(),
        device_label text NULL,
        last_seen_at timestamptz NULL
      );

      CREATE INDEX IF NOT EXISTS ix_user_push_token_user
        ON user_push_token(user_uid);

      CREATE UNIQUE INDEX IF NOT EXISTS ux_user_push_token_push_token
        ON user_push_token(push_token);

      CREATE TABLE IF NOT EXISTS user_notification (
        user_notification_uid text PRIMARY KEY,
        user_uid text NOT NULL,
        notification_type text NOT NULL,
        notification_priority text NOT NULL DEFAULT 'normal',
        notification_title text NOT NULL,
        notification_body text NOT NULL,
        notification_image_url text NULL,
        notification_deep_link text NULL,
        notification_metadata_json jsonb NOT NULL DEFAULT '{}',
        notification_is_read boolean NOT NULL DEFAULT false,
        notification_read_at timestamptz NULL,
        notification_delivered_push boolean NOT NULL DEFAULT false,
        notification_created_at timestamptz NOT NULL DEFAULT now(),
        notification_expires_at timestamptz NULL
      );

      CREATE INDEX IF NOT EXISTS ix_user_notification_user
        ON user_notification(user_uid);

      CREATE INDEX IF NOT EXISTS ix_user_notification_user_unread
        ON user_notification(user_uid)
        WHERE notification_is_read = false;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS user_notification CASCADE;
      DROP TABLE IF EXISTS user_push_token CASCADE;

      ALTER TABLE user_notification_preference
        DROP CONSTRAINT IF EXISTS fk_user_notification_preference_user;

      DROP TABLE IF EXISTS user_notification_preference CASCADE;
    `);
  }
}
