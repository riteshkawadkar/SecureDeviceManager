using SDM.Application.DTOs.Command;
using SDM.Domain.Entities;

namespace SDM.Application.Interfaces
{
    public interface ICommandService
    {
        Task<DeviceCommand> CreateCommandAsync(Guid deviceId, string commandType, string payload, Guid? actorUserId = null, Guid? batchId = null);
        Task ReportCommandStatusAsync(Guid deviceId, Guid commandId, bool success);
        Task<BulkCommandResult> CreateBulkCommandAsync(IEnumerable<Guid> deviceIds, string commandType, string payload, Guid? actorUserId = null, Guid? batchId = null);
        Task AcknowledgeCommandAsync(Guid deviceId, Guid commandId);
        Task<IEnumerable<DeviceCommandDto>> GetPendingCommandsAsync(Guid deviceId);
    }
}
