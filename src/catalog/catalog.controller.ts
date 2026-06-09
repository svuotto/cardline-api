import { Controller, Get, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { CatalogService } from './catalog.service';

@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get('manifest.json')
  manifest() {
    return this.catalogService.getManifest();
  }

  @Get(':name')
  async file(@Param('name') name: string, @Res() res: Response) {
    const out = await this.catalogService.getFile(name);

    // Minimal-Header fürs Caching (MVP)
    res.setHeader('Content-Type', out.contentType);
    res.setHeader('Cache-Control', 'public, max-age=60');

    return res.status(200).send(out.body);
  }
}
