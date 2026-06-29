using Microsoft.EntityFrameworkCore;
using SDM.Application.DTOs.Device;
using SDM.Application.Interfaces;
using SDM.Domain.Entities;
using SDM.Infrastructure.Data;

namespace SDM.Infrastructure.Services
{
    public class ViolationService : IViolationService
    {
        private readonly ApplicationDbContext _db;

        public ViolationService(ApplicationDbContext db)
        {
            _db = db;
        }

        public async Task<IEnumerable<DeviceViolationDto>> GetByDeviceAsync(Guid deviceId)
        {
            return await _db.DeviceViolations
                .AsNoTracking()
                .Where(v => v.DeviceId == deviceId)
                .OrderByDescending(v => v.CreatedOn)
                .Select(v => new DeviceViolationDto { Id = v.Id, Description = v.Description, CreatedOn = v.CreatedOn })
                .ToListAsync();
        }

        public async Task<DeviceViolationDto> AddAsync(Guid deviceId, string description)
        {
            var v = new DeviceViolation
            {
                Id = Guid.NewGuid(),
                DeviceId = deviceId,
                Description = description,
                CreatedOn = DateTime.UtcNow
            };

            _db.DeviceViolations.Add(v);
            await _db.SaveChangesAsync();

            return new DeviceViolationDto { Id = v.Id, Description = v.Description, CreatedOn = v.CreatedOn };
        }
    }
}
