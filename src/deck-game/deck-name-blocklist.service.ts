import { Injectable } from "@nestjs/common";
import { TextBlocklistService } from "../common/text-blocklist.service";

@Injectable()
export class DeckNameBlocklistService {
  constructor(private readonly textBlocklistService: TextBlocklistService) {}

  isBlockedDeckName(deckName: string): boolean {
    return this.textBlocklistService.findBlockedMatch(deckName) !== null;
  }
}