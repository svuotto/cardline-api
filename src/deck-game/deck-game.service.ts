import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Not, Repository } from "typeorm";
import { randomUUID } from "crypto";
import { DeckGameDto } from "./deck-game.dto";
import { DeckCardDto } from "./deck-card.dto";
import { DeckGameEntity } from "./deck-game.entity";
import { DeckCardEntity } from "./deck-card.entity";
import { DeckGameCreateDto } from "./deck-game-create.dto";
import { DeckGameUpdateDto } from "./deck-game-update.dto";
import { DeckGameDetailDto } from "./deck-game-detail.dto";
import { DeckGameValidationDto } from "./deck-game-validation.dto";
import { DeckNameBlocklistService } from "./deck-name-blocklist.service";

@Injectable()
export class DeckGameService {
  constructor(
    @InjectRepository(DeckGameEntity)
    private readonly deckGameRepo: Repository<DeckGameEntity>,

    @InjectRepository(DeckCardEntity)
    private readonly deckCardRepo: Repository<DeckCardEntity>,

    private readonly deckNameBlocklistService: DeckNameBlocklistService,
  ) {}

  async getMyDeckGames(userUid: string): Promise<DeckGameDto[]> {
    const decks = await this.deckGameRepo.find({
      where: {
        userUid,
        deckGameRemovedAt: IsNull(),
      },
      order: {
        deckGameUpdatedAt: "DESC",
      },
    });

    return decks.map((deck) => this.mapDeckGameToDto(deck));
  }

  async getMyRemovedDeckGames(userUid: string): Promise<DeckGameDto[]> {
    const decks = await this.deckGameRepo.find({
      where: {
        userUid,
        deckGameRemovedAt: Not(IsNull()),
      },
      order: {
        deckGameRemovedAt: "DESC",
      },
    });

    return decks.map((deck) => this.mapDeckGameToDto(deck));
  }

  async getMyDeckGameDetail(
    userUid: string,
    deckGameUid: string
  ): Promise<DeckGameDetailDto> {
    const deck = await this.deckGameRepo.findOne({
      where: {
        deckGameUid,
        userUid,
        deckGameRemovedAt: IsNull(),
      },
    });

    if (!deck) {
      throw new NotFoundException("Deck not found.");
    }

    const cards = await this.deckCardRepo.find({
      where: { deckGameUid },
      order: {
        deckCardSection: "ASC",
        deckCardPositionInt: "ASC",
      },
    });

    return {
      deck: this.mapDeckGameToDto(deck),
      cards: cards.map((card) => this.mapDeckCardToDto(card)),
      validation: this.validateDeck(cards),
    };
  }

  async getMyRemovedDeckGameDetail(
    userUid: string,
    deckGameUid: string
  ): Promise<DeckGameDetailDto> {
    const deck = await this.deckGameRepo.findOne({
      where: {
        deckGameUid,
        userUid,
        deckGameRemovedAt: Not(IsNull()),
      },
    });

    if (!deck) {
      throw new NotFoundException("Removed deck not found.");
    }

    const cards = await this.deckCardRepo.find({
      where: { deckGameUid },
      order: {
        deckCardSection: "ASC",
        deckCardPositionInt: "ASC",
      },
    });

    return {
      deck: this.mapDeckGameToDto(deck),
      cards: cards.map((card) => this.mapDeckCardToDto(card)),
      validation: this.validateDeck(cards),
    };
  }

  async createMyDeckGame(userUid: string, dto: DeckGameCreateDto): Promise<DeckGameDetailDto> {
    const now = new Date();
    
    const deck = this.deckGameRepo.create({
      deckGameUid: randomUUID(),
      userUid,
      deckGameName: this.validateDeckName(dto.deckGameName ?? "Untitled Deck"),
      deckGameFormat: dto.deckGameFormat ?? null,
      deckGameLanguageCode: dto.deckGameLanguageCode,
      leaderCardLocalizationUid: null,
      deckGameSourceType: "user",
      deckGameIsPublic: false,
      deckGameIsHighlighted: false,
      deckGameRemovedAt: null,
      deckGameCreatedAt: now,
      deckGameUpdatedAt: now,
    });

    await this.deckGameRepo.save(deck);

    return {
      deck: this.mapDeckGameToDto(deck),
      cards: [],
      validation: this.validateDeck([]),
    };
  }

  async updateMyDeckGame(userUid: string, deckGameUid: string, dto: DeckGameUpdateDto): Promise<DeckGameDetailDto> {
    const deck = await this.deckGameRepo.findOne({
      where: {
        deckGameUid,
        userUid,
        deckGameRemovedAt: IsNull(),
      },
    });

    if (!deck) {
      throw new NotFoundException("Deck not found.");
    }
    /*
    if (dto.deckGameName !== undefined) {
      deck.deckGameName = this.validateDeckName(dto.deckGameName);
    }
    */

    deck.deckGameName = this.validateDeckName(
      dto.deckGameName ?? deck.deckGameName,
    );

    if (dto.deckGameLanguageCode !== undefined) {
      deck.deckGameLanguageCode = dto.deckGameLanguageCode;
    }

    if (dto.leaderCardLocalizationUid !== undefined) {
      deck.leaderCardLocalizationUid = dto.leaderCardLocalizationUid;
    }

    if (dto.deckGameFormat !== undefined) {
      deck.deckGameFormat = dto.deckGameFormat;
    }

    if (dto.deckGameIsPublic !== undefined) {
      deck.deckGameIsPublic = dto.deckGameIsPublic;
    }

    await this.deckGameRepo.save(deck);

    await this.deckCardRepo.delete({ deckGameUid });

    const now = new Date();

    const cards = dto.cards.map((card) =>
      this.deckCardRepo.create({
        deckCardUid: randomUUID(),
        deckGameUid,
        cardLocalizationUid: card.cardLocalizationUid,
        deckCardSection: card.deckCardSection,
        deckCardQuantity: card.deckCardQuantity,
        deckCardLimit: card.deckCardLimit,
        deckCardPositionInt: card.deckCardPositionInt,
        deckCardAddedAt: now,
        deckCardUpdatedAt: now,
      })
    );

    if (cards.length > 0) {
      await this.deckCardRepo.save(cards);
    }

    return {
      deck: this.mapDeckGameToDto(deck),
      cards: cards.map((card) => this.mapDeckCardToDto(card)),
      validation: this.validateDeck(cards),
    };
  }

  async removeMyDeckGame(
    userUid: string,
    deckGameUid: string
  ): Promise<{ ok: true }> {
    const deck = await this.deckGameRepo.findOne({
      where: {
        deckGameUid,
        userUid,
        deckGameRemovedAt: IsNull(),
      },
    });

    if (!deck) {
      throw new NotFoundException("Deck not found.");
    }

    deck.deckGameRemovedAt = new Date();
    await this.deckGameRepo.save(deck);

    return { ok: true };
  }

  async restoreMyDeckGame(
    userUid: string,
    deckGameUid: string
  ): Promise<{ ok: true }> {
    const deck = await this.deckGameRepo.findOne({
      where: {
        deckGameUid,
        userUid,
        deckGameRemovedAt: Not(IsNull()),
      },
    });

    if (!deck) {
      throw new NotFoundException("Removed deck not found.");
    }

    deck.deckGameRemovedAt = null;
    await this.deckGameRepo.save(deck);

    return { ok: true };
  }

  async deleteMyDeckGame(
    userUid: string,
    deckGameUid: string
  ): Promise<{ ok: true }> {
    const deck = await this.deckGameRepo.findOne({
      where: {
        deckGameUid,
        userUid,
        deckGameRemovedAt: Not(IsNull()),
      },
    });

    if (!deck) {
      throw new NotFoundException("Removed deck not found.");
    }

    await this.deckGameRepo.delete({ deckGameUid });

    return { ok: true };
  }

  async getTierDeckGames(): Promise<DeckGameDto[]> {
    const decks = await this.deckGameRepo.find({
      where: {
        deckGameSourceType: "tier",
        deckGameRemovedAt: IsNull(),
      },
      order: {
        deckGameIsHighlighted: "DESC",
        deckGameUpdatedAt: "DESC",
      },
    });

    return decks.map((deck) => this.mapDeckGameToDto(deck));
  }

  async getTierDeckGameDetail(deckGameUid: string): Promise<DeckGameDetailDto> {
    const deck = await this.deckGameRepo.findOne({
      where: {
        deckGameUid,
        deckGameSourceType: "tier",
        deckGameRemovedAt: IsNull(),
      },
    });

    if (!deck) {
      throw new NotFoundException("Tier deck not found.");
    }

    const cards = await this.deckCardRepo.find({
      where: { deckGameUid },
      order: {
        deckCardSection: "ASC",
        deckCardPositionInt: "ASC",
      },
    });

    return {
      deck: this.mapDeckGameToDto(deck),
      cards: cards.map((card) => this.mapDeckCardToDto(card)),
      validation: this.validateDeck(cards),
    };
  }

  async copyTierDeckGameToUser(userUid: string, sourceDeckGameUid: string): Promise<DeckGameDetailDto> {
    const sourceDeck = await this.deckGameRepo.findOne({
      where: {
        deckGameUid: sourceDeckGameUid,
        deckGameSourceType: "tier",
        deckGameRemovedAt: IsNull(),
      },
    });

    if (!sourceDeck) {
      throw new NotFoundException("Tier deck not found.");
    }

    const sourceCards = await this.deckCardRepo.find({
      where: { deckGameUid: sourceDeckGameUid },
      order: {
        deckCardSection: "ASC",
        deckCardPositionInt: "ASC",
      },
    });

    const newDeckUid = randomUUID();
    const now = new Date();

    const newDeck = this.deckGameRepo.create({
      deckGameUid: newDeckUid,
      userUid,
      deckGameName: `${sourceDeck.deckGameName} Copy`,
      deckGameFormat: sourceDeck.deckGameFormat,
      deckGameLanguageCode: sourceDeck.deckGameLanguageCode,
      leaderCardLocalizationUid: sourceDeck.leaderCardLocalizationUid,
      deckGameSourceType: "user",
      deckGameIsPublic: false,
      deckGameIsHighlighted: false,
      deckGameRemovedAt: null,
      deckGameCreatedAt: now,
      deckGameUpdatedAt: now,
    });

    await this.deckGameRepo.save(newDeck);

    const newCards = sourceCards.map((card) =>
      this.deckCardRepo.create({
        deckCardUid: randomUUID(),
        deckGameUid: newDeckUid,
        cardLocalizationUid: card.cardLocalizationUid,
        deckCardSection: card.deckCardSection,
        deckCardQuantity: card.deckCardQuantity,
        deckCardLimit: card.deckCardLimit,
        deckCardPositionInt: card.deckCardPositionInt,
        deckCardAddedAt: now,
        deckCardUpdatedAt: now,
      })
    );

    if (newCards.length > 0) {
      await this.deckCardRepo.save(newCards);
    }

    return {
      deck: this.mapDeckGameToDto(newDeck),
      cards: newCards.map((card) => this.mapDeckCardToDto(card)),
      validation: this.validateDeck(newCards),
    };
  }

  private mapDeckGameToDto(deck: DeckGameEntity): DeckGameDto {
    return {
      deckGameUid: deck.deckGameUid,
      userUid: deck.userUid,
      deckGameName: deck.deckGameName,
      deckGameFormat: deck.deckGameFormat,
      deckGameLanguageCode: deck.deckGameLanguageCode,
      leaderCardLocalizationUid: deck.leaderCardLocalizationUid,
      deckGameSourceType: deck.deckGameSourceType,
      deckGameIsPublic: deck.deckGameIsPublic,
      deckGameIsHighlighted: deck.deckGameIsHighlighted,
      deckGameCreatedAt: deck.deckGameCreatedAt.toISOString(),
      deckGameUpdatedAt: deck.deckGameUpdatedAt.toISOString(),
      deckGameRemovedAt: deck.deckGameRemovedAt
        ? deck.deckGameRemovedAt.toISOString()
        : null,
    };
  }

  private mapDeckCardToDto(card: DeckCardEntity): DeckCardDto {
    return {
      deckCardUid: card.deckCardUid,
      deckGameUid: card.deckGameUid,
      cardLocalizationUid: card.cardLocalizationUid,
      deckCardSection: card.deckCardSection,
      deckCardQuantity: card.deckCardQuantity,
      deckCardLimit: card.deckCardLimit,
      deckCardPositionInt: card.deckCardPositionInt,
      deckCardAddedAt: card.deckCardAddedAt.toISOString(),
      deckCardUpdatedAt: card.deckCardUpdatedAt.toISOString(),
    };
  }

  private validateDeckName(raw: string): string {
    const name = raw.trim();

    if (this.deckNameBlocklistService.isBlockedDeckName(name)) {
      throw new BadRequestException("Deck name is not allowed.");
    }

    if (!name) {
      throw new BadRequestException("Deck name cannot be empty.");
    }

    if (name.length > 25) {
      throw new BadRequestException("Deck name can contain a maximum of 25 characters.");
    }

    return name;
  }

  validateDeckNamePublic(name: string): void {
    this.validateDeckName(name);
  }

  private validateDeck(cards: DeckCardEntity[]): DeckGameValidationDto {
    let leaderCount = 0;
    let mainCount = 0;
    let donCount = 0;

    for (const card of cards) {
      switch (card.deckCardSection) {
        case "leader":
          leaderCount += card.deckCardQuantity;
          break;
        case "main":
          mainCount += card.deckCardQuantity;
          break;
        case "don":
          donCount += card.deckCardQuantity;
          break;
      }
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    if (leaderCount !== 1) {
      errors.push("Deck must contain exactly 1 leader.");
    }

    if (mainCount !== 50) {
      warnings.push(`Main contains ${mainCount}/50 cards.`);
    }

    if (donCount !== 10) {
      warnings.push(`Don contains ${donCount}/10 cards.`);
    }

    return {
      isValid: leaderCount === 1 && mainCount === 50 && donCount === 10,
      leaderCount,
      mainCount,
      donCount,
      errors,
      warnings,
    };
  }
}