import { Module } from "@nestjs/common";
import { FeeService } from "./fee.service";
import { FeeController } from "./fee.controller";
import { SubscriptionModule } from "../subscription/subscription.module";
import { UserModule } from "../user/user.module";

@Module({
  imports: [SubscriptionModule, UserModule],
  controllers: [FeeController],
  providers: [FeeService],
  exports: [FeeService],
})
export class FeeModule {}