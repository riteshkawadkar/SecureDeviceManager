using Microsoft.EntityFrameworkCore;
using SDM.Application.DTOs.App;
using SDM.Application.DTOs.AuditLog;
using SDM.Application.Interfaces;
using SDM.Domain.Entities;
using SDM.Infrastructure.Data;

namespace SDM.Infrastructure.Services
{
    public class AppService : IAppService
    {
        private readonly ApplicationDbContext _db;

        public AppService(ApplicationDbContext db)
        {
            _db = db;
        }

        private static AppDto ToDto(AppEntry a) => new()
        {
            Id = a.Id,
            Name = a.Name,
            PackageId = a.PackageId,
            Version = a.Version,
            Category = a.Category,
            Installs = a.Installs,
            AppStatus = a.AppStatus,
            Severity = a.Severity,
            BlockReason = a.BlockReason,
            RequestedBy = a.RequestedBy,
            RequestedOn = a.RequestedOn,
            CreatedOn = a.CreatedOn
        };

        public async Task<PagedResult<AppDto>> GetAllAsync(AppStatus? status, string? category, int page, int pageSize)
        {
            var query = _db.Apps.AsNoTracking().AsQueryable();

            if (status.HasValue)
                query = query.Where(a => a.AppStatus == status.Value);

            if (!string.IsNullOrEmpty(category))
                query = query.Where(a => a.Category == category);

            var total = await query.CountAsync();
            var items = await query
                .OrderBy(a => a.Name)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(a => ToDto(a))
                .ToListAsync();

            return new PagedResult<AppDto> { Items = items, Total = total, Page = page, PageSize = pageSize };
        }

        public async Task<AppDto?> GetByIdAsync(Guid id)
        {
            var app = await _db.Apps.FindAsync(id);
            return app == null ? null : ToDto(app);
        }

        public async Task<AppDto> CreateAsync(CreateAppRequest request)
        {
            var app = new AppEntry
            {
                Id = Guid.NewGuid(),
                Name = request.Name,
                PackageId = request.PackageId,
                Version = request.Version,
                Category = request.Category,
                AppStatus = request.AppStatus,
                Severity = request.Severity,
                BlockReason = request.BlockReason,
                RequestedBy = request.RequestedBy,
                RequestedOn = request.RequestedBy != null ? DateTime.UtcNow : null,
                CreatedOn = DateTime.UtcNow
            };

            _db.Apps.Add(app);
            await _db.SaveChangesAsync();
            return ToDto(app);
        }

        public async Task<AppDto?> UpdateAsync(Guid id, UpdateAppRequest request)
        {
            var app = await _db.Apps.FindAsync(id);
            if (app == null) return null;

            app.Name = request.Name;
            app.Version = request.Version;
            app.Category = request.Category;
            app.Severity = request.Severity;
            app.BlockReason = request.BlockReason;

            await _db.SaveChangesAsync();
            return ToDto(app);
        }

        public async Task<AppDto?> SetStatusAsync(Guid id, AppStatus status)
        {
            var app = await _db.Apps.FindAsync(id);
            if (app == null) return null;

            app.AppStatus = status;
            await _db.SaveChangesAsync();
            return ToDto(app);
        }

        public async Task<bool> DeleteAsync(Guid id)
        {
            var app = await _db.Apps.FindAsync(id);
            if (app == null) return false;

            _db.Apps.Remove(app);
            await _db.SaveChangesAsync();
            return true;
        }
    }
}
