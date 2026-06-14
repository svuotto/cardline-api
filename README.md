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

## Hetzner test deploy

See `deploy/docker-compose.test.yml` and `deploy/env.test.example`.

```bash
# On server: /opt/cardline/api = cloned repo, /opt/cardline/.env = secrets
cp api/deploy/env.test.example .env
# edit .env, then from /opt/cardline:
docker compose --project-directory /opt/cardline -f api/deploy/docker-compose.test.yml up -d --build
curl http://127.0.0.1/health
```
