import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity({ name: "app_user_deleted" })
export class AppUserDeletedEntity {
  @PrimaryColumn({ type: "uuid", name: "user_uid" })
  userUid!: string;

  @Column({ type: "timestamptz", name: "deleted_at" })
  deletedAt!: Date;
}