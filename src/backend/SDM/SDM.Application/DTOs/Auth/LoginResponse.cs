using SDM.Application.DTOs.Users;

namespace SDM.Application.DTOs.Auth
{
    public class LoginResponse
    {
        public string Token { get; set; } = string.Empty;
        public UserDto User { get; set; } = null!;
    }
}
