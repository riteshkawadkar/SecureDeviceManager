using SDM.Application.DTOs.AuditLog;
using SDM.Application.DTOs.Command;
using SDM.Application.DTOs.Device;
using SDM.Domain.Entities;
using SDM.Domain.Enums;

namespace SDM.Application.Interfaces
{
    public interface IDeviceService
    {
        Task<Device> RegisterAsync(DeviceRegisterRequest request);

        Task UpdateHeartbeatAsync(Guid deviceId, HeartbeatRequest request);

        Task RegisterPushTokenAsync(Guid deviceId, string token);

        Task UpdateManagementModeAsync(Guid deviceId, ManagementMode managementMode);

        Task<IEnumerable<Device>> GetAllAsync();

        Task<PagedResult<DeviceDto>> GetPagedAsync(DeviceQueryParams query);

        Task<Device?> GetByIdAsync(Guid deviceId);

        Task<IEnumerable<DeviceCommandDto>> GetCommandsByDeviceAsync(Guid deviceId);

        Task<DeviceRegisterWithTokenResponse> RegisterWithTokenAsync(DeviceRegisterWithTokenRequest request);

        Task DeleteAsync(Guid deviceId);
    }
}
