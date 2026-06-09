import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn, } from "typeorm";

@Entity("inventory_card")
@Index("ux_inventory_card_user_core_lang", ["userUid", "cardCoreUid", "lang"], { unique: true })
export class InventoryCardEntity {
  @PrimaryGeneratedColumn("uuid", { name: "inventory_uid" })
  inventoryUid!: string;

  @Column({ name: "user_uid", type: "uuid" })
  userUid!: string;

  @Column({ name: "card_core_uid", type: "varchar", length: 100 })
  cardCoreUid!: string;

  @Column({ name: "lang", type: "varchar", length: 16 })
  lang!: string;

  @Column({ name: "quantity", type: "int" })
  quantity!: number;

  @CreateDateColumn({ name: "added_at", type: "timestamptz" })
  addedAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;
}