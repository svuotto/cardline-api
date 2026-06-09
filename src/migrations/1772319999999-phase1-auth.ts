import { MigrationInterface, QueryRunner } from "typeorm";

/** Legacy no-op: previously dropped all auth tables before recreate. */
export class Phase1User1772319999999 implements MigrationInterface {
  name = "Phase1User1772319999999";

  public async up(_queryRunner: QueryRunner): Promise<void> {}

  public async down(_queryRunner: QueryRunner): Promise<void> {}
}
