import { Body, Controller, Get, Put, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt.guard";
import { UpsertInventoryCardDto } from "./inventory-card.dto";
import { InventoryCardService } from "./inventory-card.service";

@Controller("inventory/cards")
@UseGuards(JwtAuthGuard)
export class InventoryCardController {
  constructor(
    private readonly inventoryCardService: InventoryCardService,
  ) {}

  @Get()
  async getAll(@Req() req: any) {
    return this.inventoryCardService.getAllForUser(req.user.userUid);
  }

  @Put()
  async upsert(@Req() req: any, @Body() dto: UpsertInventoryCardDto) {
    return this.inventoryCardService.upsertForUser(req.user.userUid, dto);
  }
}