using SDM.Application.DTOs.AppPackage;
using SDM.Application.DTOs.AuditLog;

namespace SDM.Application.Interfaces
{
    public interface IAppPackageService
    {
        Task<PagedResult<AppPackageDto>> GetAllAsync(string? search, int page, int pageSize);
        Task<AppPackageDto?> GetByIdAsync(Guid id);
        Task<AppPackageDto> CreateAsync(CreateAppPackageRequest request);
        Task<AppPackageDto?> UpdateAsync(Guid id, UpdateAppPackageRequest request);
        Task<bool> DeleteAsync(Guid id);

        Task<List<AppInstallationDto>> PushInstallAsync(Guid appPackageId, PushInstallRequest request, Guid? actorUserId);
        Task<List<AppInstallationDto>> PushUninstallAsync(Guid appPackageId, PushInstallRequest request, Guid? actorUserId);
        Task<List<AppInstallationDto>> GetInstallationsAsync(Guid appPackageId);
    }
}
