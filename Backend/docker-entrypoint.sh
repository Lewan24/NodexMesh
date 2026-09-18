#!/bin/sh
set -eu

if [ -f /run/secrets/postgres_password ]; then
  postgres_password=$(cat /run/secrets/postgres_password)
  export ConnectionStrings__Default="Host=${POSTGRES_HOST:-db};Port=${POSTGRES_PORT:-5432};Database=${POSTGRES_DB:-nodexmesh};Username=${POSTGRES_USER:-nodexmesh_app};Password=${postgres_password}"
fi

if [ -f /run/secrets/jwt_key ]; then
  export Jwt__Key=$(cat /run/secrets/jwt_key)
fi

exec dotnet NodexMeshApi.dll
