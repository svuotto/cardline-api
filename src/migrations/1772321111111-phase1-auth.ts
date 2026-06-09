import { MigrationInterface, QueryRunner } from "typeorm";

/** Legacy no-op: recreation required invalid FKs to card_localization (composite PK). */
export class Phase1UserRecreateUuid1772321111111 implements MigrationInterface {
  name = "Phase1UserRecreateUuid1772321111111";

  public async up(_queryRunner: QueryRunner): Promise<void> {}

  public async down(_queryRunner: QueryRunner): Promise<void> {}
}
