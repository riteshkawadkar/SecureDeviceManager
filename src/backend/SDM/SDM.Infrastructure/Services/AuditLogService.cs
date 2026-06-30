using Microsoft.EntityFrameworkCore;
using SDM.Application.DTOs.AuditLog;
using SDM.Application.Interfaces;
using SDM.Infrastructure.Data;

namespace SDM.Infrastructure.Services
{
    public class AuditLogService : IAuditLogService
    {
        private readonly ApplicationDbContext _db;

        public AuditLogService(ApplicationDbContext db)
        {
            _db = db;
        }

        public async Task<PagedResult<AuditLogDto>> GetAllAsync(string? entityName, int page, int pageSize)
        {
            var query = _db.AuditLogs.AsNoTracking().AsQueryable();

            if (!string.IsNullOrEmpty(entityName))
                query = query.Where(a => a.EntityName == entityName);

            var total = await query.CountAsync();
            var items = await query
                .OrderByDescending(a => a.Timestamp)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(a => new AuditLogDto
                {
                    Id = a.Id,
                    UserId = a.UserId,
                    Action = a.Action,
                    EntityName = a.EntityName,
                    EntityId = a.EntityId,
                    OldValue = a.OldValue,
                    NewValue = a.NewValue,
                    Timestamp = a.Timestamp
                })
                .ToListAsync();

            return new PagedResult<AuditLogDto> { Items = items, Total = total, Page = page, PageSize = pageSize };
        }

        public async Task<PagedResult<AuditLogDto>> GetByDeviceAsync(Guid deviceId, int page, int pageSize)
        {
            // "Device" rows are keyed by the device's own id (registration/deletion); "DeviceCommand"
            // rows are keyed by the command's id, so they need a join back to DeviceCommands to scope
            // them to this device.
            var query = _db.AuditLogs.AsNoTracking().Where(a =>
                (a.EntityName == "Device" && a.EntityId == deviceId) ||
                (a.EntityName == "DeviceCommand" && _db.DeviceCommands.Any(c => c.Id == a.EntityId && c.DeviceId == deviceId)));

            var total = await query.CountAsync();
            var items = await query
                .OrderByDescending(a => a.Timestamp)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(a => new AuditLogDto
                {
                    Id = a.Id,
                    UserId = a.UserId,
                    Action = a.Action,
                    EntityName = a.EntityName,
                    EntityId = a.EntityId,
                    OldValue = a.OldValue,
                    NewValue = a.NewValue,
                    Timestamp = a.Timestamp
                })
                .ToListAsync();

            return new PagedResult<AuditLogDto> { Items = items, Total = total, Page = page, PageSize = pageSize };
        }
    }
}
