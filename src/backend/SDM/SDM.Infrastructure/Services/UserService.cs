using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using SDM.Application.DTOs.Users;
using SDM.Application.Interfaces;
using SDM.Domain.Constants;
using SDM.Domain.Entities;
using SDM.Infrastructure.Data;

namespace SDM.Infrastructure.Services;

public class UserService : IUserService
{
    private readonly ApplicationDbContext _db;

    public UserService(ApplicationDbContext db)
    {
        _db = db;
    }

    public async Task<IEnumerable<UserDto>> GetAllAsync()
    {
        var users = await _db.Users
            .Include(u => u.Role)
            .AsNoTracking()
            .OrderBy(u => u.FirstName)
            .ToListAsync();

        return users.Select(ToDto);
    }

    public async Task<UserDto?> GetByIdAsync(Guid id)
    {
        var user = await _db.Users
            .Include(u => u.Role)
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == id);

        return user == null ? null : ToDto(user);
    }

    public async Task<UserDto> CreateAsync(CreateUserRequest request, ClaimsPrincipal actor)
    {
        var exists = await _db.Users.AnyAsync(x => x.Email == request.Email);
        if (exists)
            throw new InvalidOperationException("Email already exists");

        var role = await _db.Roles.FindAsync(request.RoleId)
            ?? throw new InvalidOperationException("Role not found");

        if (role.Name == Roles.SuperAdmin && !actor.IsInRole(Roles.SuperAdmin))
            throw new InvalidOperationException("Only a SuperAdmin can assign the SuperAdmin role");

        var user = new User
        {
            Id = Guid.NewGuid(),
            FirstName = request.FirstName,
            LastName = request.LastName,
            Email = request.Email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            RoleId = role.Id,
            IsActive = true,
            CreatedOn = DateTime.UtcNow
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        user.Role = role;
        return ToDto(user);
    }

    public async Task<UserDto?> UpdateAsync(Guid id, UpdateUserRequest request, ClaimsPrincipal actor)
    {
        var user = await _db.Users.Include(u => u.Role).FirstOrDefaultAsync(u => u.Id == id);
        if (user == null) return null;

        var role = await _db.Roles.FindAsync(request.RoleId)
            ?? throw new InvalidOperationException("Role not found");

        var actorId = GetActorId(actor);
        var demotingSelf = user.Id == actorId && role.Name != user.Role.Name;
        if (demotingSelf)
            throw new InvalidOperationException("You cannot change your own role");

        if (user.Id == actorId && !request.IsActive)
            throw new InvalidOperationException("You cannot deactivate your own account");

        if (role.Name == Roles.SuperAdmin && !actor.IsInRole(Roles.SuperAdmin))
            throw new InvalidOperationException("Only a SuperAdmin can assign the SuperAdmin role");

        var losingSuperAdmin = user.Role.Name == Roles.SuperAdmin && role.Name != Roles.SuperAdmin;
        var deactivatingSuperAdmin = user.Role.Name == Roles.SuperAdmin && !request.IsActive;
        if (losingSuperAdmin || deactivatingSuperAdmin)
            await EnsureNotLastActiveSuperAdmin(user.Id);

        user.FirstName = request.FirstName;
        user.LastName = request.LastName;
        user.RoleId = role.Id;
        user.IsActive = request.IsActive;

        await _db.SaveChangesAsync();

        user.Role = role;
        return ToDto(user);
    }

    public async Task DeleteAsync(Guid id, ClaimsPrincipal actor)
    {
        var user = await _db.Users.Include(u => u.Role).FirstOrDefaultAsync(u => u.Id == id);
        if (user == null)
            throw new KeyNotFoundException("User not found");

        if (user.Id == GetActorId(actor))
            throw new InvalidOperationException("You cannot delete your own account");

        if (user.Role.Name == Roles.SuperAdmin)
            await EnsureNotLastActiveSuperAdmin(user.Id);

        _db.Users.Remove(user);
        await _db.SaveChangesAsync();
    }

    public async Task ChangePasswordAsync(Guid userId, ChangePasswordRequest request)
    {
        var user = await _db.Users.FindAsync(userId)
            ?? throw new KeyNotFoundException("User not found");

        if (!BCrypt.Net.BCrypt.Verify(request.CurrentPassword, user.PasswordHash))
            throw new InvalidOperationException("Current password is incorrect");

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
        await _db.SaveChangesAsync();
    }

    public async Task ResetPasswordAsync(Guid id, ResetPasswordRequest request)
    {
        var user = await _db.Users.FindAsync(id)
            ?? throw new KeyNotFoundException("User not found");

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
        await _db.SaveChangesAsync();
    }

    public async Task<IEnumerable<RoleDto>> GetRolesAsync()
    {
        return await _db.Roles
            .AsNoTracking()
            .OrderBy(r => r.Name)
            .Select(r => new RoleDto { Id = r.Id, Name = r.Name })
            .ToListAsync();
    }

    private async Task EnsureNotLastActiveSuperAdmin(Guid excludingUserId)
    {
        var otherActiveSuperAdmins = await _db.Users
            .Include(u => u.Role)
            .CountAsync(u => u.Id != excludingUserId && u.IsActive && u.Role.Name == Roles.SuperAdmin);

        if (otherActiveSuperAdmins == 0)
            throw new InvalidOperationException("Cannot remove the last active SuperAdmin");
    }

    private static Guid GetActorId(ClaimsPrincipal actor)
    {
        var sub = actor.FindFirst(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)?.Value
            ?? actor.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        return Guid.TryParse(sub, out var id) ? id : Guid.Empty;
    }

    private static UserDto ToDto(User u) => new()
    {
        Id = u.Id,
        FirstName = u.FirstName,
        LastName = u.LastName,
        Email = u.Email,
        RoleId = u.RoleId,
        RoleName = u.Role.Name,
        IsActive = u.IsActive,
        CreatedOn = u.CreatedOn
    };
}
