using Microsoft.EntityFrameworkCore;
using SDM.Application.DTOs.DeviceAssignment;
using SDM.Application.Interfaces;
using SDM.Domain.Entities;
using SDM.Infrastructure.Data;

namespace SDM.Infrastructure.Services
{
    public class DeviceAssignmentService : IDeviceAssignmentService
    {
        private readonly ApplicationDbContext _db;

        public DeviceAssignmentService(ApplicationDbContext db)
        {
            _db = db;
        }

        public async Task<IEnumerable<DeviceAssignmentDto>> GetAllAsync()
        {
            return await _db.DeviceAssignments
                .AsNoTracking()
                .Select(a => ToDto(a))
                .ToListAsync();
        }

        public async Task<DeviceAssignmentDto?> GetByDeviceIdAsync(Guid deviceId)
        {
            var a = await _db.DeviceAssignments
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.DeviceId == deviceId);

            return a == null ? null : ToDto(a);
        }

        public async Task<DeviceAssignmentDto> AssignAsync(Guid deviceId, AssignDeviceRequest request, string assignedBy)
        {
            var existing = await _db.DeviceAssignments.FirstOrDefaultAsync(x => x.DeviceId == deviceId);
            if (existing != null)
            {
                existing.AssignedTo = request.AssignedTo;
                existing.AssignedAt = DateTime.UtcNow;
                existing.AssignedBy = assignedBy;
                existing.Notes = request.Notes;
                await _db.SaveChangesAsync();
                return ToDto(existing);
            }

            var assignment = new DeviceAssignment
            {
                Id = Guid.NewGuid(),
                DeviceId = deviceId,
                AssignedTo = request.AssignedTo,
                AssignedAt = DateTime.UtcNow,
                AssignedBy = assignedBy,
                Notes = request.Notes
            };

            _db.DeviceAssignments.Add(assignment);
            await _db.SaveChangesAsync();
            return ToDto(assignment);
        }

        public async Task<bool> UnassignAsync(Guid deviceId)
        {
            var a = await _db.DeviceAssignments.FirstOrDefaultAsync(x => x.DeviceId == deviceId);
            if (a == null) return false;

            _db.DeviceAssignments.Remove(a);
            await _db.SaveChangesAsync();
            return true;
        }

        private static DeviceAssignmentDto ToDto(DeviceAssignment a) => new()
        {
            Id = a.Id,
            DeviceId = a.DeviceId,
            AssignedTo = a.AssignedTo,
            AssignedAt = a.AssignedAt,
            AssignedBy = a.AssignedBy,
            Notes = a.Notes
        };
    }
}
