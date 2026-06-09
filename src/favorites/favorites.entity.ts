import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { AppUserEntity } from "../user/user.entity";

@Entity({ name: "favorite_card" })
@Index("ux_favorite_card_user_card_core_uid", ["userUid", "cardCoreUid"], { unique: true })
export class FavoriteEntity {
  @PrimaryGeneratedColumn("uuid", { name: "favorite_uid" })
  favoriteUid!: string;

  @Column({ type: "uuid", name: "user_uid" })
  userUid!: string;

  @ManyToOne(() => AppUserEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_uid", referencedColumnName: "userUid" })
  user?: AppUserEntity;

  @Column({ type: "text", name: "card_core_uid" })
  cardCoreUid!: string;

  @Column({ type: "timestamptz", name: "created_at" })
  createdAt!: Date;
}