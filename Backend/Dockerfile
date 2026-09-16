# syntax=docker/dockerfile:1

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Restore first, as its own layer — dependencies change far less often than source,
# so editing a .cs file doesn't invalidate the (slow) restore.
COPY src/NodexMeshApi/NodexMeshApi.csproj src/NodexMeshApi/
RUN dotnet restore src/NodexMeshApi/NodexMeshApi.csproj

COPY src/ src/
RUN dotnet publish src/NodexMeshApi/NodexMeshApi.csproj \
    -c Release \
    -o /app/publish \
    --no-restore \
    /p:UseAppHost=false

# Runtime image: aspnet (not sdk) — smaller, and no compiler toolchain in production.
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app

# Run as an unprivileged user. The aspnet images ship with a non-root 'app' user (UID 64198).
USER app

COPY --from=build --chown=app:app /app/publish .

ENV ASPNETCORE_URLS=http://+:8080 \
    ASPNETCORE_ENVIRONMENT=Production \
    DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=false

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
    CMD ["dotnet", "--info"]

ENTRYPOINT ["dotnet", "NodexMeshApi.dll"]
