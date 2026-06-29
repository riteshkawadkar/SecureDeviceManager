using SDM.Application.DTOs.Device;

namespace SDM.Application.Interfaces
{
    public interface IViolationService
    {
        Task<IEnumerable<DeviceViolationDto>> GetByDeviceAsync(Guid deviceId);
        Task<DeviceViolationDto> AddAsync(Guid deviceId, string description);
    }
}
