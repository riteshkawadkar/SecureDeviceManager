using Microsoft.EntityFrameworkCore;
using SDM.Application.DTOs.AuditLog;
using SDM.Application.DTOs.Command;
using SDM.Application.DTOs.Device;
using Microsoft.Extensions.Logging;
using SDM.Application.Interfaces;
using SDM.Domain.Entities;
using SDM.Domain;
using SDM.Domain.Enums;
using SDM.Infrastructure.Data;

namespace SDM.Infrastructure.Services
{
    public class DeviceService : IDeviceService
    {
        private readonly ApplicationDbContext _db;
        private readonly SDM.Application.Interfaces.IJwtTokenGenerator _jwtGenerator;
        private readonly ILogger<DeviceService> _logger;
        private readonly SDM.Application.Interfaces.IPushService _pushService;

        public DeviceService(ApplicationDbContext db, SDM.Application.Interfaces.IJwtTokenGenerator jwtGenerator, ILogger<DeviceService> logger, SDM.Application.Interfaces.IPushService pushService)
        {
            _db = db;
            _jwtGenerator = jwtGenerator;
            _logger = logger;
            _pushService = pushService;
        }

        public async Task<Device> RegisterAsync(DeviceRegisterRequest request)
        {
            var existing = await _db.Devices.FirstOrDefaultAsync(d => d.DeviceIdentifier == request.DeviceIdentifier);
            if (existing != null)
            {
                // update metadata
                existing.SerialNumber = request.SerialNumber;
                existing.Manufacturer = request.Manufacturer;
                existing.Model = request.Model;
                existing.AndroidVersion = request.AndroidVersion;
                existing.UpdatedOn = DateTime.UtcNow;

                await _db.SaveChangesAsync();
                return existing;
            }

            var device = new Device
            {
                Id = Guid.NewGuid(),
                DeviceIdentifier = request.DeviceIdentifier,
                SerialNumber = request.SerialNumber,
                Manufacturer = request.Manufacturer,
                Model = request.Model,
                AndroidVersion = request.AndroidVersion,
                Status = DeviceStatus.Online,
                CreatedOn = DateTime.UtcNow
            };

            _db.Devices.Add(device);
            await _db.SaveChangesAsync();

            // Audit
            _db.AuditLogs.Add(new SDM.Domain.Entities.AuditLog
            {
                Id = Guid.NewGuid(),
                Action = "DeviceRegistered",
                EntityName = "Device",
                EntityId = device.Id,
                NewValue = System.Text.Json.JsonSerializer.Serialize(device),
                Timestamp = DateTime.UtcNow
            });

            await _db.SaveChangesAsync();

            return device;
        }

        public async Task UpdateHeartbeatAsync(Guid deviceId, HeartbeatRequest request)
        {
            var device = await _db.Devices.FindAsync(deviceId);
            if (device == null)
                throw new KeyNotFoundException("Device not found");

            device.BatteryLevel = request.Battery;
            device.LastSeen = DateTime.UtcNow;
            device.Status = DeviceStatus.Online;
            device.UpdatedOn = DateTime.UtcNow;

            var hb = new DeviceHeartbeat
            {
                Id = Guid.NewGuid(),
                DeviceId = deviceId,
                BatteryLevel = request.Battery,
                FreeStorage = request.FreeStorage,
                Latitude = request.Latitude,
                Longitude = request.Longitude,
                CreatedOn = DateTime.UtcNow
            };

            _db.DeviceHeartbeats.Add(hb);
            await _db.SaveChangesAsync();
        }

        public async Task RegisterPushTokenAsync(Guid deviceId, string token)
        {
            var exists = await _db.DevicePushTokens
                .FirstOrDefaultAsync(t => t.DeviceId == deviceId && t.Token == token);

            if (exists != null)
            {
                exists.IsActive = true;
                await _db.SaveChangesAsync();
                return;
            }

            var pt = new DevicePushToken
            {
                Id = Guid.NewGuid(),
                DeviceId = deviceId,
                Token = token,
                CreatedOn = DateTime.UtcNow,
                IsActive = true
            };

            _db.DevicePushTokens.Add(pt);
            await _db.SaveChangesAsync();
        }

        public async Task UpdateManagementModeAsync(Guid deviceId, ManagementMode managementMode)
        {
            var device = await _db.Devices.FirstOrDefaultAsync(d => d.Id == deviceId);
            if (device == null) throw new KeyNotFoundException("Device not found");

            device.ManagementMode = managementMode;
            device.UpdatedOn = DateTime.UtcNow;
            await _db.SaveChangesAsync();
        }

        public async Task<IEnumerable<Device>> GetAllAsync()
        {
            return await _db.Devices
                .AsNoTracking()
                .ToListAsync();
        }

        public async Task<PagedResult<DeviceDto>> GetPagedAsync(DeviceQueryParams query)
        {
            var q = _db.Devices.AsNoTracking().AsQueryable();

            if (!string.IsNullOrEmpty(query.Search))
                q = q.Where(d => d.DeviceIdentifier.Contains(query.Search) ||
                                 d.Model.Contains(query.Search) ||
                                 d.SerialNumber.Contains(query.Search) ||
                                 (d.AssignedUserName != null && d.AssignedUserName.Contains(query.Search)));

            if (!string.IsNullOrEmpty(query.AndroidVersion))
                q = q.Where(d => d.AndroidVersion == query.AndroidVersion);

            if (!string.IsNullOrEmpty(query.Status) && Enum.TryParse<DeviceStatus>(query.Status, true, out var statusEnum))
                q = q.Where(d => d.Status == statusEnum);

            var total = await q.CountAsync();
            var items = await q
                .OrderByDescending(d => d.LastSeen)
                .Skip((query.Page - 1) * query.PageSize)
                .Take(query.PageSize)
                .Select(d => new DeviceDto
                {
                    Id = d.Id,
                    DeviceIdentifier = d.DeviceIdentifier,
                    SerialNumber = d.SerialNumber,
                    Manufacturer = d.Manufacturer,
                    Model = d.Model,
                    AndroidVersion = d.AndroidVersion,
                    BatteryLevel = d.BatteryLevel,
                    LastSeen = d.LastSeen,
                    Status = d.Status,
                    ComplianceStatus = d.ComplianceStatus,
                    AssignedUserName = d.AssignedUserName,
                    GroupId = d.GroupId,
                    EnrollmentType = d.EnrollmentType,
                    ManagementMode = d.ManagementMode,
                    CreatedOn = d.CreatedOn,
                    UpdatedOn = d.UpdatedOn
                })
                .ToListAsync();

            return new PagedResult<DeviceDto> { Items = items, Total = total, Page = query.Page, PageSize = query.PageSize };
        }

        public async Task<Device?> GetByIdAsync(Guid deviceId)
        {
            return await _db.Devices.AsNoTracking().FirstOrDefaultAsync(d => d.Id == deviceId);
        }

        public async Task<IEnumerable<DeviceCommandDto>> GetCommandsByDeviceAsync(Guid deviceId)
        {
            var commands = await _db.DeviceCommands
                .AsNoTracking()
                .Where(c => c.DeviceId == deviceId)
                .OrderByDescending(c => c.CreatedOn)
                .ToListAsync();

            // Resolve "who issued this command" from the CommandCreated audit log entry rather than
            // a column on DeviceCommand itself, since that's where the actor's user id is already captured.
            var commandIds = commands.Select(c => c.Id).ToList();
            var creatorByCommandId = await _db.AuditLogs
                .AsNoTracking()
                .Where(a => a.EntityName == "DeviceCommand" && a.UserId != null && a.EntityId != null && commandIds.Contains(a.EntityId.Value))
                .Join(_db.Users.AsNoTracking(), a => a.UserId, u => u.Id, (a, u) => new { CommandId = a.EntityId!.Value, u.Id, Name = u.FirstName + " " + u.LastName })
                .ToDictionaryAsync(x => x.CommandId, x => x);

            return commands.Select(c =>
            {
                creatorByCommandId.TryGetValue(c.Id, out var creator);
                return new DeviceCommandDto
                {
                    Id = c.Id,
                    DeviceId = c.DeviceId,
                    CommandType = c.CommandType,
                    Payload = c.Payload,
                    Status = (int)c.Status,
                    RetryCount = c.RetryCount,
                    MaxRetries = c.MaxRetries,
                    CreatedOn = c.CreatedOn,
                    ExecutedOn = c.ExecutedOn,
                    AcknowledgedOn = c.AcknowledgedOn,
                    BatchId = c.BatchId,
                    CreatedByUserId = creator?.Id,
                    CreatedByName = creator?.Name,
                };
            });
        }

        public async Task<DeviceRegisterWithTokenResponse> RegisterWithTokenAsync(DeviceRegisterWithTokenRequest request)
        {
            try
            {
                _logger.LogInformation("RegisterWithToken attempt for deviceIdentifier={deviceIdentifier}", request.DeviceIdentifier);

                // Note: do not log the full token. Log last 6 chars only for traceability
                var shortToken = string.IsNullOrEmpty(request.Token) ? "(none)" : (request.Token.Length > 6 ? request.Token[^6..] : request.Token);
                _logger.LogDebug("Enrollment token suffix={tokenSuffix}", shortToken);

            // validate token
            var token = await _db.EnrollmentTokens.FirstOrDefaultAsync(t => t.Token == request.Token);
            if (token == null || !token.IsActive || token.ExpiresOn < DateTime.UtcNow)
            {
                _logger.LogWarning("Enrollment token invalid or expired for suffix={tokenSuffix}", shortToken);
                throw new Exception("Invalid or expired enrollment token");
            }

            // enforce max devices if needed
            if (token.MaxDevices <= 0)
            {
                _logger.LogWarning("Enrollment token has no remaining device slots for suffix={tokenSuffix}", token.Token?.Substring(Math.Max(0, token.Token.Length - 6)));
                throw new Exception("Enrollment token has no remaining device slots");
            }

            // reuse existing register logic if device exists
            var existing = await _db.Devices.FirstOrDefaultAsync(d => d.DeviceIdentifier == request.DeviceIdentifier);
            Device device;
            bool isNewDevice = existing == null;
            if (existing != null)
            {
                existing.SerialNumber = request.SerialNumber;
                existing.Manufacturer = request.Manufacturer;
                existing.Model = request.Model;
                existing.AndroidVersion = request.AndroidVersion;
                existing.EnrollmentType = token.EnrollmentType;
                existing.ManagementMode = request.ManagementMode;
                existing.UpdatedOn = DateTime.UtcNow;

                await _db.SaveChangesAsync();
                device = existing;
            }
            else
            {
                device = new Device
                {
                    Id = Guid.NewGuid(),
                    DeviceIdentifier = request.DeviceIdentifier,
                    SerialNumber = request.SerialNumber,
                    Manufacturer = request.Manufacturer,
                    Model = request.Model,
                    AndroidVersion = request.AndroidVersion,
                    Status = DeviceStatus.Online,
                    EnrollmentType = token.EnrollmentType,
                    ManagementMode = request.ManagementMode,
                    CreatedOn = DateTime.UtcNow
                };

                _db.Devices.Add(device);
                await _db.SaveChangesAsync();

                _db.AuditLogs.Add(new SDM.Domain.Entities.AuditLog
                {
                    Id = Guid.NewGuid(),
                    Action = "DeviceRegistered",
                    EntityName = "Device",
                    EntityId = device.Id,
                    NewValue = System.Text.Json.JsonSerializer.Serialize(device),
                    Timestamp = DateTime.UtcNow
                });

                await _db.SaveChangesAsync();
            }

            // Register FCM token if provided, avoiding duplicates
            if (!string.IsNullOrWhiteSpace(request.FcmToken))
            {
                await RegisterPushTokenAsync(device.Id, request.FcmToken);
                _logger.LogInformation("Registered FCM token for deviceId={deviceId}", device.Id);
            }

            // Only decrement the enrollment token slot for genuinely new devices
            if (isNewDevice)
            {
                token.MaxDevices -= 1;
                if (token.MaxDevices <= 0)
                    token.IsActive = false;
                await _db.SaveChangesAsync();
            }

            _logger.LogInformation("Device registered successfully deviceId={deviceId} tokenSuffix={tokenSuffix}", device.Id, token.Token?.Length > 6 ? token.Token[^6..] : token.Token);

            // create a pseudo-user for device token generation (not persisted)
            var deviceUser = new SDM.Domain.Entities.User
            {
                Id = Guid.NewGuid(),
                FirstName = "Device",
                LastName = device.DeviceIdentifier,
                Email = $"device+{device.Id}@local",
                PasswordHash = "",
                CreatedOn = DateTime.UtcNow,
                RoleId = (await _db.Roles.FirstOrDefaultAsync(r => r.Name == "Viewer"))?.Id ?? Guid.NewGuid()
            };

            return new SDM.Application.DTOs.Device.DeviceRegisterWithTokenResponse
            {
                DeviceId = device.Id,
                DeviceJwt = _jwtGenerator.GenerateDeviceToken(new SDM.Domain.Entities.User
                {
                    Id = device.Id,
                    Email = deviceUser.Email,
                    Role = new SDM.Domain.Entities.Role { Id = Guid.NewGuid(), Name = "Device" }
                }, expiryMinutes: 60 * 24 * 7),
                ExpiresInSeconds = 60 * 60 * 24 * 7,
                EnrollmentType = device.EnrollmentType
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during RegisterWithToken for deviceIdentifier={deviceIdentifier}", request.DeviceIdentifier);
            throw;
        }
        }

        public async Task DeleteAsync(Guid deviceId)
        {
            var device = await _db.Devices.FindAsync(deviceId);
            if (device == null) throw new Exception("Device not found");

            // Notify the device to unenroll before removing its token from the DB.
            // Best-effort: a failure here does not block the delete.
            try
            {
                await _pushService.SendToDeviceAsync(deviceId, "Device Removed", "This device has been removed from management.", new { action = "UNENROLL" });
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Could not send UNENROLL FCM for device {DeviceId}", deviceId);
            }

            // DeviceCommand and DeviceHeartbeat cascade via OnModelCreating.
            // DevicePushToken has no cascade configured, so remove explicitly.
            var pushTokens = _db.DevicePushTokens.Where(t => t.DeviceId == deviceId);
            _db.DevicePushTokens.RemoveRange(pushTokens);

            _db.Devices.Remove(device);

            _db.AuditLogs.Add(new SDM.Domain.Entities.AuditLog
            {
                Id = Guid.NewGuid(),
                Action = "DeviceDeleted",
                EntityName = "Device",
                EntityId = deviceId,
                NewValue = System.Text.Json.JsonSerializer.Serialize(new { deviceId }),
                Timestamp = DateTime.UtcNow
            });

            await _db.SaveChangesAsync();
            _logger.LogInformation("Device deleted: deviceId={deviceId}", deviceId);
        }
    }
}
