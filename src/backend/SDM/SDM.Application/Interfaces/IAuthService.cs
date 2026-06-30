using SDM.Application.DTOs.Auth;

namespace SDM.Application.Interfaces
{
    public interface IAuthService
    {
        Task<LoginResponse> LoginAsync(LoginRequest request);
    }
}
