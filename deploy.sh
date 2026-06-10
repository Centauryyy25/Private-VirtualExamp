#!/usr/bin/env bash
#
# Deploy / rebuild the production stack (CasaOS).
#
# Usage:
#   ./deploy.sh           # rebuild images + redeploy
#   ./deploy.sh --no-build # redeploy without rebuilding (e.g. config-only change)
#
set -euo pipefail

cd "$(dirname "$0")"

COMPOSE_FILE="docker-compose.casaos.yml"
ENV_FILE=".env.production"

# .env.production is REQUIRED: Compose interpolates ${POSTGRES_PASSWORD},
# ${SECRET_KEY}, ${SERVER_IP} etc. from --env-file, NOT from the service's
# env_file: directive. Without this flag those values resolve to empty strings
# and the backend fails with "password authentication failed for user postgres".
if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: $ENV_FILE not found. Create it from .env.example first." >&2
  exit 1
fi

BUILD_FLAG="--build"
if [[ "${1:-}" == "--no-build" ]]; then
  BUILD_FLAG=""
fi

echo "==> Deploying production stack ($COMPOSE_FILE)"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d $BUILD_FLAG

echo "==> Waiting for services to start..."
sleep 6

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps

# Health checks
echo "==> Health checks"
backend=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/docs || echo "000")
frontend=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 || echo "000")
echo "    backend (/docs): $backend"
echo "    frontend (/):    $frontend"

if [[ "$backend" != "200" || "$frontend" != "200" ]]; then
  echo "==> WARNING: a service is not healthy. Recent backend logs:" >&2
  docker logs virtualexamp-backend 2>&1 | tail -20
  exit 1
fi

echo "==> Deploy complete. All services healthy."
