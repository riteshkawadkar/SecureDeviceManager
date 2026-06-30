using System.Security.Claims;
using SDM.Application.DTOs.Users;

namespace SDM.Application.Interfaces
{
    public interface IUserService
    {
        Task<IEnumerable<UserDto>> GetAllAsync();
        Task<UserDto?> GetByIdAsync(Guid id);
        Task<UserDto> CreateAsync(CreateUserRequest request, ClaimsPrincipal actor);
        Task<UserDto?> UpdateAsync(Guid id, UpdateUserRequest request, ClaimsPrincipal actor);
        Task DeleteAsync(Guid id, ClaimsPrincipal actor);
        Task ChangePasswordAsync(Guid userId, ChangePasswordRequest request);
        Task ResetPasswordAsync(Guid id, ResetPasswordRequest request);
        Task<IEnumerable<RoleDto>> GetRolesAsync();
    }
}
