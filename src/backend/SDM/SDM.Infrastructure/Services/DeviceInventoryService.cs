using Microsoft.EntityFrameworkCore;
using SDM.Application.DTOs.AppPackage;
using SDM.Application.DTOs.AuditLog;
using SDM.Application.Interfaces;
using SDM.Domain.Entities;
using SDM.Infrastructure.Data;

namespace SDM.Infrastructure.Services
{
    public class DeviceInventoryService : IDeviceInventoryService
    {
        private readonly ApplicationDbContext _db;

        public DeviceInventoryService(ApplicationDbContext db)
        {
            _db = db;
        }

        public async Task ReportInstalledAppsAsync(Guid deviceId, ReportInstalledAppsRequest request)
        {
            var now = DateTime.UtcNow;
            var existing = await _db.DeviceInstalledApps
                .Where(d => d.DeviceId == deviceId)
                .ToListAsync();
            var existingByPackage = existing.ToDictionary(d => d.PackageId);
            var reportedPackageIds = new HashSet<string>(request.Apps.Select(a => a.PackageId));

            foreach (var item in request.Apps)
            {
                if (existingByPackage.TryGetValue(item.PackageId, out var row))
                {
                    row.AppName = item.AppName;
                    row.VersionName = item.VersionName;
                    row.VersionCode = item.VersionCode;
                    row.IsSystemApp = item.IsSystemApp;
                    row.LastSeenOn = now;
                }
                else
                {
                    _db.DeviceInstalledApps.Add(new DeviceInstalledApp
                    {
                        Id = Guid.NewGuid(),
                        DeviceId = deviceId,
                        PackageId = item.PackageId,
                        AppName = item.AppName,
                        VersionName = item.VersionName,
                        VersionCode = item.VersionCode,
                        IsSystemApp = item.IsSystemApp,
                        FirstSeenOn = now,
                        LastSeenOn = now
                    });
                }
            }

            // Apps no longer reported by the device have been uninstalled — drop them from inventory.
            var stale = existing.Where(d => !reportedPackageIds.Contains(d.PackageId));
            _db.DeviceInstalledApps.RemoveRange(stale);

            await _db.SaveChangesAsync();
        }

        public async Task<PagedResult<DeviceInstalledAppDto>> GetInstalledAppsAsync(Guid deviceId, int page, int pageSize)
        {
            var query = _db.DeviceInstalledApps.AsNoTracking().Where(d => d.DeviceId == deviceId);

            var total = await query.CountAsync();
            var items = await query
                .OrderBy(d => d.AppName ?? d.PackageId)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(d => new DeviceInstalledAppDto
                {
                    Id = d.Id,
                    DeviceId = d.DeviceId,
                    PackageId = d.PackageId,
                    AppName = d.AppName,
                    VersionName = d.VersionName,
                    VersionCode = d.VersionCode,
                    IsSystemApp = d.IsSystemApp,
                    FirstSeenOn = d.FirstSeenOn,
                    LastSeenOn = d.LastSeenOn
                })
                .ToListAsync();

            return new PagedResult<DeviceInstalledAppDto> { Items = items, Total = total, Page = page, PageSize = pageSize };
        }
    }
}
