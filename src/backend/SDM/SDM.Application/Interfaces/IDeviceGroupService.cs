using SDM.Application.DTOs.DeviceGroup;

namespace SDM.Application.Interfaces
{
    public interface IDeviceGroupService
    {
        Task<IEnumerable<DeviceGroupDto>> GetAllAsync();
        Task<DeviceGroupDto?> GetByIdAsync(Guid id);
        Task<DeviceGroupDto> CreateAsync(CreateDeviceGroupRequest request);
        Task<DeviceGroupDto?> UpdateAsync(Guid id, UpdateDeviceGroupRequest request);
        Task<bool> DeleteAsync(Guid id);
    }
}
