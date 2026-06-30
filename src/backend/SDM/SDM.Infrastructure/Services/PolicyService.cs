using Microsoft.EntityFrameworkCore;
using SDM.Application.DTOs.Policy;
using SDM.Application.Interfaces;
using SDM.Infrastructure.Data;

namespace SDM.Infrastructure.Services
{
    public class PolicyService : IPolicyService
    {
        private readonly ApplicationDbContext _db;
        private readonly ICommandService _commandService;

        public PolicyService(ApplicationDbContext db, ICommandService commandService)
        {
            _db = db;
            _commandService = commandService;
        }

        private static PolicyDto ToDto(SDM.Domain.Entities.Policy p) => new()
        {
            Id = p.Id,
            Name = p.Name,
            PolicyJson = p.PolicyJson,
            IsEnabled = p.IsEnabled,
            Category = p.Category,
            Severity = p.Severity,
            CommandType = p.CommandType,
            CreatedOn = p.CreatedOn
        };

        public async Task<IEnumerable<PolicyDto>> GetAllAsync()
        {
            var policies = await _db.Policies.AsNoTracking().OrderBy(p => p.Category).ThenBy(p => p.Name).ToListAsync();
            return policies.Select(ToDto);
        }

        public async Task<PolicyDto?> GetByIdAsync(Guid id)
        {
            var p = await _db.Policies.FindAsync(id);
            return p == null ? null : ToDto(p);
        }

        public async Task<PolicyDto> CreateAsync(CreatePolicyRequest request)
        {
            var policy = new SDM.Domain.Entities.Policy
            {
                Id = Guid.NewGuid(),
                Name = request.Name,
                PolicyJson = request.PolicyJson,
                IsEnabled = request.IsEnabled,
                Category = request.Category,
                Severity = request.Severity,
                CommandType = request.CommandType,
                CreatedOn = DateTime.UtcNow
            };

            _db.Policies.Add(policy);
            await _db.SaveChangesAsync();
            return ToDto(policy);
        }

        public async Task<PolicyDto?> UpdateAsync(Guid id, UpdatePolicyRequest request)
        {
            var policy = await _db.Policies.FindAsync(id);
            if (policy == null) return null;

            policy.Name = request.Name;
            policy.PolicyJson = request.PolicyJson;
            policy.Category = request.Category;
            policy.Severity = request.Severity;
            policy.CommandType = request.CommandType;

            await _db.SaveChangesAsync();
            return ToDto(policy);
        }

        public async Task<PolicyEnforceResult> EnforceAsync(Guid id, Guid? actorUserId = null)
        {
            var policy = await _db.Policies.FindAsync(id)
                ?? throw new KeyNotFoundException($"Policy {id} not found.");

            if (string.IsNullOrWhiteSpace(policy.CommandType))
                throw new InvalidOperationException("This policy has no command type configured.");

            var devices = await _db.Devices.AsNoTracking().ToListAsync();
            int sent = 0;
            foreach (var device in devices)
            {
                try
                {
                    await _commandService.CreateCommandAsync(device.Id, policy.CommandType, "{}", actorUserId);
                    sent++;
                }
                catch { /* best-effort: continue to next device */ }
            }

            return new PolicyEnforceResult { TotalDevices = devices.Count, CommandsSent = sent };
        }

        public async Task<PolicyDto?> ToggleAsync(Guid id)
        {
            var policy = await _db.Policies.FindAsync(id);
            if (policy == null) return null;

            policy.IsEnabled = !policy.IsEnabled;
            await _db.SaveChangesAsync();
            return ToDto(policy);
        }

        public async Task<bool> DeleteAsync(Guid id)
        {
            var policy = await _db.Policies.FindAsync(id);
            if (policy == null) return false;

            _db.Policies.Remove(policy);
            await _db.SaveChangesAsync();
            return true;
        }
    }
}
