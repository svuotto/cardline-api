# Cardline API

NestJS backend for the Cardline iOS app.

## Local setup

```bash
cp .env.example .env
npm install
npm run migration:run
npm run start:dev
```

API: `http://localhost:3000`  
Health: `http://localhost:3000/health`

## Secrets

- Never commit `.env`, `keys/`, or `*.p8` files.
- Use `.env.example` as the template for local, test, and production servers.
- Production and test credentials live only on the server and in your password manager.

## Environments

| Environment | API URL |
|-------------|---------|
| Local | `http://localhost:3000` |
| Test | `https://api-test.cardline.io` |
| Production | `https://api.cardline.io` |

On the Hetzner test server, set `DB_HOST=postgres` when using Docker Compose.
