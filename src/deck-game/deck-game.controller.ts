import { Body, Controller, Delete, Get, Param, Post, Put, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt.guard";
import { Public } from "../auth/public.decorator";
import { DeckGameService } from "./deck-game.service";
import { DeckGameCreateDto } from "./deck-game-create.dto";
import { DeckGameUpdateDto } from "./deck-game-update.dto";
import { DeckNameValidateDto } from "./deck-name-validate.dto";

@UseGuards(JwtAuthGuard)
@Controller("deck-games")
export class DeckGameController {
  constructor(private readonly deckGameService: DeckGameService) {}

  @Get("me")
  async getMyDeckGames(@Req() req: any) {
    return this.deckGameService.getMyDeckGames(req.user.userUid);
  }

  @Get("me/removed")
  async getMyRemovedDeckGames(@Req() req: any) {
    return this.deckGameService.getMyRemovedDeckGames(req.user.userUid);
  }

  @Get("me/removed/:deckGameUid")
  async getMyRemovedDeckGame(
    @Req() req: any,
    @Param("deckGameUid") deckGameUid: string,
  ) {
    return this.deckGameService.getMyRemovedDeckGameDetail(
      req.user.userUid,
      deckGameUid,
    );
  }

  @Get("me/:deckGameUid")
  async getMyDeckGame(@Req() req: any, @Param("deckGameUid") deckGameUid: string,) {
    return this.deckGameService.getMyDeckGameDetail(
      req.user.userUid,
      deckGameUid,
    );
  }

  @Post("me")
  async createMyDeckGame(@Req() req: any, @Body() dto: DeckGameCreateDto) {
    return this.deckGameService.createMyDeckGame(req.user.userUid, dto);
  }

  @Put("me/:deckGameUid")
  async updateMyDeckGame(@Req() req: any, @Param("deckGameUid") deckGameUid: string, @Body() dto: DeckGameUpdateDto,) {
    return this.deckGameService.updateMyDeckGame(
      req.user.userUid,
      deckGameUid,
      dto,
    );
  }

  @Post("me/:deckGameUid/remove")
  async removeMyDeckGame(@Req() req: any, @Param("deckGameUid") deckGameUid: string,) {
    return this.deckGameService.removeMyDeckGame(
      req.user.userUid,
      deckGameUid,
    );
  }

  @Post("me/:deckGameUid/restore")
  async restoreMyDeckGame(@Req() req: any, @Param("deckGameUid") deckGameUid: string,) {
    return this.deckGameService.restoreMyDeckGame(
      req.user.userUid,
      deckGameUid,
    );
  }

  @Delete("me/:deckGameUid")
  async deleteMyDeckGame(@Req() req: any, @Param("deckGameUid") deckGameUid: string,) {
    return this.deckGameService.deleteMyDeckGame(
      req.user.userUid,
      deckGameUid,
    );
  }

  @Public()
  @Get("tier")
  async getTierDeckGames() {
    return this.deckGameService.getTierDeckGames();
  }

  @Public()
  @Get("tier/:deckGameUid")
  async getTierDeckGame(@Param("deckGameUid") deckGameUid: string) {
    return this.deckGameService.getTierDeckGameDetail(deckGameUid);
  }

  @Post("tier/:deckGameUid/copy")
  async copyTierDeckGameToUser(
    @Req() req: any,
    @Param("deckGameUid") deckGameUid: string,
  ) {
    return this.deckGameService.copyTierDeckGameToUser(
      req.user.userUid,
      deckGameUid,
    );
  }

  @Post("me/validate-name")
  async validateDeckName(@Body() dto: DeckNameValidateDto) {
    this.deckGameService.validateDeckNamePublic(dto.deckGameName);
    return { ok: true };
  }
}