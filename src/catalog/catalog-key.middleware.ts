import { Injectable, NestMiddleware, UnauthorizedException } from "@nestjs/common";
import type { Request, Response, NextFunction } from "express";

@Injectable()
export class CatalogKeyMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    const provided = req.header("x-catalog-key");
    const expected = process.env.CATALOG_PUBLIC_KEY;

    if (!expected || provided !== expected) {
      throw new UnauthorizedException("Invalid catalog key");
    }

    next();
  }
}