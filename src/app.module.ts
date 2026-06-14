import { MiddlewareConsumer, Module, NestModule, RequestMethod } from "@nestjs/common";
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthController } from './health.controller';
import { AuthModule } from './auth/auth.module';
import { CardsModule } from './cards/cards.module';
import { CatalogModule } from './catalog/catalog.module';
import { DeckGameModule } from "./deck-game/deck-game.module";
import { DeviceBindingModule } from "./device-binding/device-binding.module";
import { InventoryCardModule } from "./inventory/inventory-card.module";
import { FavoritesModule } from "./favorites/favorites.module";
import { SubscriptionModule } from "./subscription/subscription.module";
import { FeeModule } from "./fee/fee.module";
import { CatalogKeyMiddleware } from "./catalog/catalog-key.middleware";
import { APP_GUARD, Reflector } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { ScheduleModule } from "@nestjs/schedule";
import { NotificationModule } from "./notification/notification.module";
import { FeedbackModule } from "./feedback/feedback.module";
import { MailModule } from "./mail/mail.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MailModule,
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        type: 'postgres',
        host: cfg.get('DB_HOST'),
        port: Number(cfg.get('DB_PORT')),
        username: cfg.get('DB_USER'),
        password: cfg.get('DB_PASSWORD'),
        database: cfg.get('DB_NAME'),
        autoLoadEntities: true,
        synchronize: false, // wichtig: Schema existiert bereits
      }),
    }),

    CardsModule,
    CatalogModule,
    AuthModule,
    NotificationModule,
    DeviceBindingModule,
    InventoryCardModule,
    FavoritesModule,
    SubscriptionModule,
    FeeModule,
    DeckGameModule,
    FeedbackModule,
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 120,
      },
    ]),
    ScheduleModule.forRoot(),
  ],
  controllers: [HealthController],
  providers: [
    Reflector,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    }, 
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(CatalogKeyMiddleware)
      .forRoutes(
        { path: "catalog/manifest.json", method: RequestMethod.GET },
        { path: "catalog/cards_en", method: RequestMethod.GET },
        { path: "catalog/cards_fr", method: RequestMethod.GET },
        { path: "catalog/cards_ja", method: RequestMethod.GET },
        { path: "catalog/sets_en", method: RequestMethod.GET },
        { path: "catalog/sets_fr", method: RequestMethod.GET },
        { path: "catalog/sets_ja", method: RequestMethod.GET },
        { path: "catalog/lookups_en", method: RequestMethod.GET },
        { path: "catalog/lookups_fr", method: RequestMethod.GET },
        { path: "catalog/lookups_ja", method: RequestMethod.GET },
        { path: "catalog/deck_restrictions", method: RequestMethod.GET },
      );
  }
}

