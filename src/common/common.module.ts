import { Module } from "@nestjs/common";
import { TextBlocklistService } from "./text-blocklist.service";

@Module({
  providers: [TextBlocklistService],
  exports: [TextBlocklistService],
})
export class CommonModule {}