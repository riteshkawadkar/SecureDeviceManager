using Microsoft.EntityFrameworkCore;
using SDM.Application;
using SDM.Application.DTOs.AppPackage;
using SDM.Application.DTOs.AuditLog;
using SDM.Application.Interfaces;
using SDM.Domain;
using SDM.Domain.Entities;
using SDM.Infrastructure.Data;

namespace SDM.Infrastructure.Services
{
    public class AppPackageService : IAppPackageService
    {
        private readonly ApplicationDbContext _db;
        private readonly ICommandService _commandService;

        public AppPackageService(ApplicationDbContext db, ICommandService commandService)
        {
            _db = db;
            _commandService = commandService;
        }

        private async Task<AppPackageDto> ToDtoAsync(AppPackage a)
        {
            var statuses = await _db.AppInstallations
                .Where(i => i.AppPackageId == a.Id && i.Action == AppInstallAction.Install)
                .Select(i => i.Command != null ? i.Command.Status : (CommandStatus?)null)
                .ToListAsync();

            return new AppPackageDto
            {
                Id = a.Id,
                Name = a.Name,
                PackageId = a.PackageId,
                Version = a.Version,
                VersionCode = a.VersionCode,
                IconUrl = a.IconUrl,
                ApkUrl = a.ApkUrl,
                Category = a.Category,
                IsSystemApp = a.IsSystemApp,
                RunAfterInstall = a.RunAfterInstall,
                ShowIcon = a.ShowIcon,
                CreatedOn = a.CreatedOn,
                UpdatedOn = a.UpdatedOn,
                PendingCount = statuses.Count(s => s is CommandStatus.Pending or CommandStatus.Sent),
                InstalledCount = statuses.Count(s => s == CommandStatus.Executed),
                FailedCount = statuses.Count(s => s == CommandStatus.Failed)
            };
        }

        public async Task<PagedResult<AppPackageDto>> GetAllAsync(string? search, int page, int pageSize)
        {
            var query = _db.AppPackages.AsNoTracking().AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim();
                query = query.Where(a => a.Name.Contains(term) || a.PackageId.Contains(term));
            }

            var total = await query.CountAsync();
            var items = await query
                .OrderBy(a => a.Name)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var dtos = new List<AppPackageDto>();
            foreach (var item in items)
                dtos.Add(await ToDtoAsync(item));

            return new PagedResult<AppPackageDto> { Items = dtos, Total = total, Page = page, PageSize = pageSize };
        }

        public async Task<AppPackageDto?> GetByIdAsync(Guid id)
        {
            var app = await _db.AppPackages.AsNoTracking().FirstOrDefaultAsync(a => a.Id == id);
            return app == null ? null : await ToDtoAsync(app);
        }

        public async Task<AppPackageDto> CreateAsync(CreateAppPackageRequest request)
        {
            var app = new AppPackage
            {
                Id = Guid.NewGuid(),
                Name = request.Name,
                PackageId = request.PackageId,
                Version = request.Version,
                VersionCode = request.VersionCode,
                IconUrl = request.IconUrl,
                ApkUrl = request.ApkUrl,
                Category = request.Category,
                IsSystemApp = request.IsSystemApp,
                RunAfterInstall = request.RunAfterInstall,
                ShowIcon = request.ShowIcon,
                CreatedOn = DateTime.UtcNow
            };

            _db.AppPackages.Add(app);
            await _db.SaveChangesAsync();
            return await ToDtoAsync(app);
        }

        public async Task<AppPackageDto?> UpdateAsync(Guid id, UpdateAppPackageRequest request)
        {
            var app = await _db.AppPackages.FindAsync(id);
            if (app == null) return null;

            app.Name = request.Name;
            app.Version = request.Version;
            app.VersionCode = request.VersionCode;
            app.IconUrl = request.IconUrl;
            app.ApkUrl = request.ApkUrl;
            app.Category = request.Category;
            app.IsSystemApp = request.IsSystemApp;
            app.RunAfterInstall = request.RunAfterInstall;
            app.ShowIcon = request.ShowIcon;
            app.UpdatedOn = DateTime.UtcNow;

            await _db.SaveChangesAsync();
            return await ToDtoAsync(app);
        }

        public async Task<bool> DeleteAsync(Guid id)
        {
            var app = await _db.AppPackages.FindAsync(id);
            if (app == null) return false;

            _db.AppPackages.Remove(app);
            await _db.SaveChangesAsync();
            return true;
        }

        private async Task<List<Guid>> ResolveTargetDeviceIdsAsync(PushInstallRequest request)
        {
            var ids = new HashSet<Guid>(request.DeviceIds ?? new List<Guid>());

            if (request.GroupId.HasValue)
            {
                var groupDeviceIds = await _db.Devices
                    .Where(d => d.GroupId == request.GroupId.Value)
                    .Select(d => d.Id)
                    .ToListAsync();
                foreach (var id in groupDeviceIds) ids.Add(id);
            }

            return ids.ToList();
        }

        public async Task<List<AppInstallationDto>> PushInstallAsync(Guid appPackageId, PushInstallRequest request, Guid? actorUserId)
        {
            var app = await _db.AppPackages.FindAsync(appPackageId);
            if (app == null) throw new Exception("App package not found");

            var deviceIds = await ResolveTargetDeviceIdsAsync(request);
            var batchId = Guid.NewGuid();
            var payload = System.Text.Json.JsonSerializer.Serialize(new
            {
                packageName = app.PackageId,
                url = app.ApkUrl,
                showIcon = app.ShowIcon,
                runAfterInstall = app.RunAfterInstall
            });

            var installations = new List<AppInstallation>();
            foreach (var deviceId in deviceIds)
            {
                var cmd = await _commandService.CreateCommandAsync(deviceId, CommandTypes.InstallApp, payload, actorUserId, batchId);
                installations.Add(new AppInstallation
                {
                    Id = Guid.NewGuid(),
                    AppPackageId = appPackageId,
                    DeviceId = deviceId,
                    Action = AppInstallAction.Install,
                    CommandId = cmd.Id,
                    CreatedOn = DateTime.UtcNow
                });
            }

            _db.AppInstallations.AddRange(installations);
            await _db.SaveChangesAsync();

            return await GetInstallationsAsync(appPackageId);
        }

        public async Task<List<AppInstallationDto>> PushUninstallAsync(Guid appPackageId, PushInstallRequest request, Guid? actorUserId)
        {
            var app = await _db.AppPackages.FindAsync(appPackageId);
            if (app == null) throw new Exception("App package not found");

            var deviceIds = await ResolveTargetDeviceIdsAsync(request);
            var batchId = Guid.NewGuid();
            var payload = System.Text.Json.JsonSerializer.Serialize(new { packageName = app.PackageId });

            var installations = new List<AppInstallation>();
            foreach (var deviceId in deviceIds)
            {
                var cmd = await _commandService.CreateCommandAsync(deviceId, CommandTypes.UninstallApp, payload, actorUserId, batchId);
                installations.Add(new AppInstallation
                {
                    Id = Guid.NewGuid(),
                    AppPackageId = appPackageId,
                    DeviceId = deviceId,
                    Action = AppInstallAction.Uninstall,
                    CommandId = cmd.Id,
                    CreatedOn = DateTime.UtcNow
                });
            }

            _db.AppInstallations.AddRange(installations);
            await _db.SaveChangesAsync();

            return await GetInstallationsAsync(appPackageId);
        }

        public async Task<List<AppInstallationDto>> GetInstallationsAsync(Guid appPackageId)
        {
            var rows = await _db.AppInstallations
                .AsNoTracking()
                .Where(i => i.AppPackageId == appPackageId)
                .Include(i => i.Device)
                .Include(i => i.Command)
                .OrderByDescending(i => i.CreatedOn)
                .ToListAsync();

            return rows.Select(i => new AppInstallationDto
            {
                Id = i.Id,
                AppPackageId = i.AppPackageId,
                DeviceId = i.DeviceId,
                DeviceName = i.Device != null ? $"{i.Device.Manufacturer} {i.Device.Model}".Trim() : string.Empty,
                Action = i.Action.ToString(),
                CommandId = i.CommandId,
                Status = MapStatus(i.Command?.Status, i.Action),
                CreatedOn = i.CreatedOn
            }).ToList();
        }

        private static string MapStatus(CommandStatus? status, AppInstallAction action) => status switch
        {
            CommandStatus.Pending => "Pending",
            CommandStatus.Sent => "Sent",
            CommandStatus.Executed => action == AppInstallAction.Uninstall ? "Uninstalled" : "Installed",
            CommandStatus.Failed => "Failed",
            _ => "Unknown"
        };
    }
}
