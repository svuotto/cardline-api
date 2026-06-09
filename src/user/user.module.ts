import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UserService } from "./user.service";
import { AccountDeletionService } from "./account-deletion.service";
import { AppUserEntity } from "./user.entity";
import { AppUserDeletedEntity } from "./user-deleted.entity";

@Module({
  imports: [TypeOrmModule.forFeature([AppUserEntity, AppUserDeletedEntity])],
  providers: [UserService, AccountDeletionService],
  exports: [UserService, AccountDeletionService],
})
export class UserModule {}
