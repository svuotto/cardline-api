import { Controller, Get, Param, Query } from '@nestjs/common';
import { CardsService } from './cards.service';

@Controller('cards')
export class CardsController {
  constructor(private readonly cards: CardsService) {}

  @Get()
  async list(
    @Query('q') q?: string,
    @Query('lang') lang?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const lim = Math.min(Math.max(parseInt(limit ?? '50', 10) || 50, 1), 200);
    const off = Math.max(parseInt(offset ?? '0', 10) || 0, 0);
    return this.cards.list({ q, lang, limit: lim, offset: off });
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    const res = await this.cards.getById(id);
    return res ?? { error: 'not_found' };
  }
}

