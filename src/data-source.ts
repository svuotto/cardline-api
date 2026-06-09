import "reflect-metadata";
import { DataSource } from "typeorm";
import * as dotenv from "dotenv";

dotenv.config(); // lädt .env

export const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.DB_USER,
  password: String(process.env.DB_PASSWORD ?? ""),  // <- wichtig: string
  database: process.env.DB_NAME,
  synchronize: false,
  logging: false,
  entities: ["dist/**/*.entity.js"],
  migrations: ["dist/migrations/*.js"],
});

