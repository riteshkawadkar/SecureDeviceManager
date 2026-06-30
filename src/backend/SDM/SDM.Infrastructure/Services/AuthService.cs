using Microsoft.EntityFrameworkCore;
using SDM.Application.DTOs.Auth;
using SDM.Application.DTOs.Users;
using SDM.Application.Interfaces;
using SDM.Infrastructure.Data;

namespace SDM.Infrastructure.Services;

public class AuthService : IAuthService
{
    private readonly ApplicationDbContext _db;
    private readonly IJwtTokenGenerator _jwtTokenGenerator;

    public AuthService(ApplicationDbContext db, IJwtTokenGenerator jwtTokenGenerator)
    {
        _db = db;
        _jwtTokenGenerator = jwtTokenGenerator;
    }

    public async Task<LoginResponse> LoginAsync(LoginRequest request)
    {
        var user = await _db.Users
            .Include(x => x.Role)
            .FirstOrDefaultAsync(x => x.Email == request.Email);

        if (user == null || !user.IsActive)
            throw new SDM.Application.Exceptions.AuthenticationException("Invalid credentials");

        var valid = BCrypt.Net.BCrypt.Verify(
            request.Password,
            user.PasswordHash);

        if (!valid)
            throw new SDM.Application.Exceptions.AuthenticationException("Invalid credentials");

        var token = _jwtTokenGenerator.GenerateToken(user);

        return new LoginResponse
        {
            Token = token,
            User = new UserDto
            {
                Id = user.Id,
                FirstName = user.FirstName,
                LastName = user.LastName,
                Email = user.Email,
                RoleId = user.RoleId,
                RoleName = user.Role.Name,
                IsActive = user.IsActive,
                CreatedOn = user.CreatedOn
            }
        };
    }
}