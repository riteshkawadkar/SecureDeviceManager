# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SecureDeviceManager (SDM) is a Mobile Device Management (MDM) backend for Android devices. The backend is a .NET 8 ASP.NET Core Web API targeting PostgreSQL, with Firebase Cloud Messaging (FCM) for push notifications and Hangfire for background job processing.

All source lives under `src/backend/SDM/`. The solution file is `src/backend/SDM/SDM.slnx`. All `dotnet` commands below should be run from that directory.

## Common Commands

```powershell
# Start local Postgres + pgAdmin via Docker Compose
docker compose up -d

# Apply EF Core migrations
dotnet ef database update --project "SDM.Infrastructure/SDM.Infrastructure.csproj" --startup-project "SDM.API/SDM.API.csproj"

# Add a new EF migration
dotnet ef migrations add <MigrationName> --project "SDM.Infrastructure/SDM.Infrastructure.csproj" --startup-project "SDM.API/SDM.API.csproj"

# Run the API in Development mode
$Env:ASPNETCORE_ENVIRONMENT='Development'; dotnet run --project "SDM.API/SDM.API.csproj"

# Build the full solution
dotnet build SDM.slnx
```

- Swagger UI: `http://localhost:<port>/swagger` (Development only)
- Hangfire dashboard: `http://localhost:<port>/hangfire` (Development only, when `Hangfire:Enabled` is true)
- pgAdmin: `http://localhost:8081` (credentials: `admin@local.com` / `admin`)

## Architecture

The solution follows Clean Architecture with four projects and a strict dependency direction:

```
SDM.Domain → SDM.Application → SDM.Infrastructure → SDM.API
```

- **SDM.Domain** — Entities (`Device`, `DeviceCommand`, `DeviceHeartbeat`, `DevicePushToken`, `EnrollmentToken`, `User`, `Role`, `AuditLog`, etc.) and enums (`DeviceStatus`, `CommandStatus`).
- **SDM.Application** — Interfaces (`IDeviceService`, `ICommandService`, `IPushService`, `IAuthService`, `IJwtTokenGenerator`), DTOs, exceptions, and settings (`JwtSettings`). No infrastructure dependencies.
- **SDM.Infrastructure** — `ApplicationDbContext` (EF Core), all service implementations, EF migrations, and `HangfireJobs`.
- **SDM.API** — Four controllers (`AuthController`, `DevicesController`, `CommandsController`, `EnrollmentController`) and `Program.cs` for DI wiring. The API references Infrastructure only for DI registration; all business logic is behind interfaces.

## Key Flows

**Device Enrollment (token-based)**
1. Admin calls `POST /api/enrollment/tokens` to create a time-limited `EnrollmentToken` (optionally `POST /api/enrollment/tokens/generate-qr` for QR).
2. Device calls `POST /api/devices/register-with-token` with the token. The token's `MaxDevices` count is decremented; when it hits 0 the token is deactivated.
3. The response includes a device JWT (7-day, role `"Device"`, `sub` = device GUID) that the device uses for subsequent authenticated calls.

**Command delivery with retry**
1. Admin calls `POST /api/devices/{id}/commands` → `CommandService.CreateCommandAsync` saves a `DeviceCommand` with `Pending` status and immediately tries an FCM push.
2. On success the status becomes `Sent`; on failure it becomes `Failed` with `RetryCount++`.
3. `HangfireJobs.ProcessPendingCommands` runs every minute, reprocessing `Pending`/`Failed` commands up to `MaxRetries` (default 5).
4. The device calls `POST /api/devices/{deviceId}/commands/{id}/status` to report execution, moving the status to `Executed` or `Failed`.

**JWT — two token types**
`IJwtTokenGenerator` / `JwtTokenGenerator` provides two methods:
- `GenerateToken(User)` — standard user JWT with email and role claims.
- `GenerateDeviceToken(User, expiryMinutes)` — device JWT with `sub` = device GUID and role `"Device"`, used to authenticate subsequent device API calls.

## Configuration

Required sections in `appsettings.json` / environment:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5432;Database=sdm_db;Username=sdm_user;Password=secret"
  },
  "Jwt": {
    "Issuer": "sdm-api",
    "Audience": "sdm-client",
    "Key": "<min 32-char secret>",
    "ExpiryMinutes": 480
  },
  "Firebase": {
    "ServiceAccountPath": "/path/to/firebase-sa.json"
  },
  "Hangfire": {
    "Enabled": true
  }
}
```

`PushService` prefers `Firebase:ServiceAccountPath` (FCM HTTP v1 with a service account JSON); falls back to `Firebase:ServerKey` (legacy). Set `Hangfire:Enabled` to `false` to skip Hangfire registration (useful for environments without Hangfire support).

The Development appsettings are at `SDM.API/appsettings.Development.json`. The Docker Compose file mounts `SDM.API/firebase-sa.json` into the container at `/app/firebase-sa.json`.

## Android Sample Agent

`samples/android-agent/` is a Gradle Android project demonstrating a reference device agent:
- Handles the `sdm://enroll?token=...` deep link (`AndroidManifest` intent-filter).
- Auto-collects `ANDROID_ID`, manufacturer, model and calls `POST /api/devices/register-with-token`.
- Stores the returned device JWT in `EncryptedSharedPreferences`.
- For emulators use base URL `http://10.0.2.2:5254/`; for real devices use the PC's LAN IP or an ngrok HTTPS URL.
