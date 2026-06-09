import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from "@nestjs/common";

import { JwtAuthGuard } from "../auth/jwt.guard";
import { FavoritesService } from "./favorites.service";
import { AddFavoriteDto } from "./favorites.dto";

@UseGuards(JwtAuthGuard)
@Controller("favorites")
export class FavoritesController {
  constructor(private readonly favorites: FavoritesService) {}

  @Get()
  async list(@Req() req: any) {
    return this.favorites.list(req.user.userUid);
  }

  @Post()
  async add(@Req() req: any, @Body() dto: AddFavoriteDto) {
    return this.favorites.add(req.user.userUid, dto.cardCoreUid);
  }

  @Delete(":cardCoreUid")
  async remove(@Req() req: any, @Param("cardCoreUid") cardCoreUid: string) {
    return this.favorites.remove(req.user.userUid, cardCoreUid);
  }
}