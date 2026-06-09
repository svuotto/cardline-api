import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { NotificationController } from "./notification.controller";
import { NotificationService } from "./notification.service";
import { NotificationEntity } from "./notification.entity";
import { PushTokenEntity } from "./user-push-token.entity";
import { UserNotificationPreferenceEntity } from "./user-notification-preference.entity";
import { APNSService } from "./apns.service";
import { AppUserEntity } from "../user/user.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      NotificationEntity,
      PushTokenEntity,
      UserNotificationPreferenceEntity,
      AppUserEntity,
    ]),
  ],
  controllers: [
    NotificationController,
  ],
  providers: [
    NotificationService,
    APNSService,
  ],
  exports: [
    NotificationService,
  ],
})
export class NotificationModule {}