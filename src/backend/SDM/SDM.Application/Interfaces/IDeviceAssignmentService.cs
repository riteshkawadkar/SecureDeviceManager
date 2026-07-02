using SDM.Application.DTOs.DeviceAssignment;

namespace SDM.Application.Interfaces
{
    public interface IDeviceAssignmentService
    {
        Task<IEnumerable<DeviceAssignmentDto>> GetAllAsync();
        Task<DeviceAssignmentDto?> GetByDeviceIdAsync(Guid deviceId);
        Task<DeviceAssignmentDto> AssignAsync(Guid deviceId, AssignDeviceRequest request, string assignedBy);
        Task<bool> UnassignAsync(Guid deviceId);
    }
}
