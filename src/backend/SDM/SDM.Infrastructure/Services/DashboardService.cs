using Microsoft.EntityFrameworkCore;
using SDM.Application.DTOs.Dashboard;
using SDM.Application.Interfaces;
using SDM.Domain;
using SDM.Infrastructure.Data;

namespace SDM.Infrastructure.Services
{
    public class DashboardService : IDashboardService
    {
        private readonly ApplicationDbContext _db;

        public DashboardService(ApplicationDbContext db)
        {
            _db = db;
        }

        public async Task<DashboardStatsResponse> GetStatsAsync()
        {
            var devices = await _db.Devices.AsNoTracking().ToListAsync();
            var totalDevices = devices.Count;
            var onlineDevices = devices.Count(d => d.Status == DeviceStatus.Online);
            var offlineDevices = devices.Count(d => d.Status == DeviceStatus.Offline);
            var activePolicies = await _db.Policies.CountAsync(p => p.IsEnabled);

            var complianceRate = totalDevices > 0
                ? Math.Round((double)onlineDevices / totalDevices * 100, 1)
                : 0;

            var osDistribution = devices
                .GroupBy(d => d.AndroidVersion)
                .Select(g => new OsDistributionItem { Version = g.Key, Count = g.Count() })
                .OrderByDescending(x => x.Count)
                .ToList();

            var recentLogs = await _db.AuditLogs
                .AsNoTracking()
                .OrderByDescending(a => a.Timestamp)
                .Take(10)
                .ToListAsync();

            var deviceLookup = devices.ToDictionary(d => d.Id, d => d.DeviceIdentifier);

            var recentActivity = recentLogs
                .Where(l => l.EntityName == "Device" && l.EntityId.HasValue)
                .Select(l => new RecentActivityItem
                {
                    DeviceId = l.EntityId!.Value,
                    DeviceIdentifier = deviceLookup.TryGetValue(l.EntityId!.Value, out var di) ? di : l.EntityId!.Value.ToString(),
                    Action = l.Action,
                    Timestamp = l.Timestamp
                })
                .ToList();

            return new DashboardStatsResponse
            {
                TotalDevices = totalDevices,
                OnlineDevices = onlineDevices,
                OfflineDevices = offlineDevices,
                ActivePolicies = activePolicies,
                ComplianceRate = complianceRate,
                OsDistribution = osDistribution,
                RecentActivity = recentActivity
            };
        }
    }
}
