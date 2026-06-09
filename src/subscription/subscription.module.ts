import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { AppUserEntity } from "../user/user.entity";
import { UserSubscriptionEntity } from "./user-subscription.entity";
import { SubscriptionController } from "./subscription.controller";
import { SubscriptionService } from "./subscription.service";
import { SubscriptionReplayService } from "./subscription-replay.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AppUserEntity,
      UserSubscriptionEntity,
    ]),
  ],
  controllers: [SubscriptionController],
  providers: [
    SubscriptionService,
    SubscriptionReplayService,
  ],
  exports: [
    SubscriptionService,
    SubscriptionReplayService,
  ],
})
export class SubscriptionModule {}