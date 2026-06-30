using SDM.Application.DTOs.AuditLog;

namespace SDM.Application.Interfaces
{
    public interface IAuditLogService
    {
        Task<PagedResult<AuditLogDto>> GetAllAsync(string? entityName, int page, int pageSize);
    }
}
