import { MigrationInterface, QueryRunner } from "typeorm";

/** Legacy no-op: superseded by Phase1Auth1772330000001. */
export class Phase1Auth1772330000000 implements MigrationInterface {
  name = "Phase1Auth1772330000000";

  public async up(_queryRunner: QueryRunner): Promise<void> {}

  public async down(_queryRunner: QueryRunner): Promise<void> {}
}
