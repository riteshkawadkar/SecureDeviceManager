using SDM.Application.DTOs.App;
using SDM.Application.DTOs.AuditLog;
using SDM.Domain.Entities;

namespace SDM.Application.Interfaces
{
    public interface IAppService
    {
        Task<PagedResult<AppDto>> GetAllAsync(AppStatus? status, string? category, int page, int pageSize);
        Task<AppDto?> GetByIdAsync(Guid id);
        Task<AppDto> CreateAsync(CreateAppRequest request);
        Task<AppDto?> UpdateAsync(Guid id, UpdateAppRequest request);
        Task<AppDto?> SetStatusAsync(Guid id, AppStatus status);
        Task<bool> DeleteAsync(Guid id);
    }
}
