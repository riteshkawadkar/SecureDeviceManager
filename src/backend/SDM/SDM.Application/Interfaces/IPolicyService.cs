using SDM.Application.DTOs.Policy;

namespace SDM.Application.Interfaces
{
    public interface IPolicyService
    {
        Task<IEnumerable<PolicyDto>> GetAllAsync();
        Task<PolicyDto?> GetByIdAsync(Guid id);
        Task<PolicyDto> CreateAsync(CreatePolicyRequest request);
        Task<PolicyDto?> UpdateAsync(Guid id, UpdatePolicyRequest request);
        Task<PolicyDto?> ToggleAsync(Guid id);
        Task<bool> DeleteAsync(Guid id);
        Task<PolicyEnforceResult> EnforceAsync(Guid id, Guid? actorUserId = null);
    }
}
