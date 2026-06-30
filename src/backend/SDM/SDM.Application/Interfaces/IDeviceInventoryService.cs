using SDM.Application.DTOs.AppPackage;
using SDM.Application.DTOs.AuditLog;

namespace SDM.Application.Interfaces
{
    public interface IDeviceInventoryService
    {
        Task ReportInstalledAppsAsync(Guid deviceId, ReportInstalledAppsRequest request);
        Task<PagedResult<DeviceInstalledAppDto>> GetInstalledAppsAsync(Guid deviceId, int page, int pageSize);
    }
}
