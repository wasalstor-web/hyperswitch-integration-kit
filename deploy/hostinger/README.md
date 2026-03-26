# Hostinger VPS — isolated onboarding UI

Serves only the **onboarding SPA** (`web/` via nginx). **Supabase** and **Hyperswitch** run in other stacks.

## Isolation

| Item | Action |
|------|--------|
| `COMPOSE_PROJECT_NAME` | Unique on the server (e.g. `hsonboard01`). |
| Network | `hs_onboard_isolated` — do not attach unrelated containers. |
| Ports | None published; Traefik reaches the service internally. |
| `VITE_*` | Build-time only; rebuild after changes. Never service-role keys. |

## Deploy

```bash
cd deploy/hostinger
cp .env.example .env
nano .env

docker compose --env-file .env up -d --build
```

Set Supabase Edge secret **`PUBLIC_APP_VERIFY_URL`** to `https://<WEB_FQDN>` (no trailing slash).

## Traefik 502

If certificates or routing fail, Traefik may not share a network with this container. Set `TRAEFIK_DOCKER_NETWORK` in `.env` (see `docker network ls`, or `docker inspect` on the Traefik container), then:

```bash
docker compose -f docker-compose.yml -f docker-compose.traefik-network.yml --env-file .env up -d --build
```

## Updates

```bash
docker compose --env-file .env up -d --build
```

## Related docs

- Arabic self-hosted Supabase + BookCars: `docs/HOSTINGER_SELFHOSTED_AR.md`
- Root kit README: `../../README.md`

## Troubleshooting

- **SPA 404 on refresh:** nginx `try_files` is configured; confirm `nginx/default.conf` is in the image.
- **Browser blocks Supabase:** fix CORS / Kong; verify `VITE_SUPABASE_URL` and anon key.
- **Healthcheck failing:** the image uses `wget` against `127.0.0.1`; if you switch base images, adjust the `healthcheck` in `docker-compose.yml`.
