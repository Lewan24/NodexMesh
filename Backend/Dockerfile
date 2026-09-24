# syntax=docker/dockerfile:1

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build

WORKDIR /src

COPY src/NodexMeshApi/NodexMeshApi.csproj ./NodexMeshApi/

RUN dotnet restore ./NodexMeshApi/NodexMeshApi.csproj \
    --force \
    --no-cache

COPY src/NodexMeshApi/ ./NodexMeshApi/

WORKDIR /src/NodexMeshApi

RUN dotnet publish NodexMeshApi.csproj \
    -c Release \
    -o /app/publish \
    /p:UseAppHost=false


FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final

WORKDIR /app

ENV ASPNETCORE_URLS=http://+:8080 \
    ASPNETCORE_ENVIRONMENT=Production \
    DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=false

EXPOSE 8080

COPY --from=build --chown=app:app /app/publish ./
COPY --chown=app:app docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

USER root

RUN sed -i 's/\r$//' /usr/local/bin/docker-entrypoint.sh \
    && chmod +x /usr/local/bin/docker-entrypoint.sh

RUN mkdir -p /app/storage && chown app:app /app/storage

USER app

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
