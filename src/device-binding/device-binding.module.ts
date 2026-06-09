import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DeviceBindingController } from "./device-binding.controller";
import { DeviceBindingService } from "./device-binding.service";
import { UserDeviceBindingEntity } from "./user-device-binding.entity";
import { AppUserEntity } from "../user/user.entity";
import { AuthModule } from "../auth/auth.module";
import { AuthRecoveryAttemptEntity } from "../auth/auth-recovery-attempt.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserDeviceBindingEntity,
      AppUserEntity,
      AuthRecoveryAttemptEntity,
    ]),
    forwardRef(() => AuthModule),
  ],
  controllers: [DeviceBindingController],
  providers: [DeviceBindingService],
  exports: [DeviceBindingService],
})
export class DeviceBindingModule {}