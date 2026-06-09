import { Injectable } from "@nestjs/common";
import { TextBlocklistService } from "../common/text-blocklist.service";

@Injectable()
export class UsernameBlocklistService {
  constructor(private readonly textBlocklistService: TextBlocklistService) {}

  isBlockedUsername(username: string): boolean {
    return this.textBlocklistService.containsBlockedText(username);
  }
}