using Microsoft.EntityFrameworkCore;
using SDM.Application.DTOs.DeviceGroup;
using SDM.Application.Interfaces;
using SDM.Infrastructure.Data;

namespace SDM.Infrastructure.Services
{
    public class DeviceGroupService : IDeviceGroupService
    {
        private readonly ApplicationDbContext _db;

        public DeviceGroupService(ApplicationDbContext db)
        {
            _db = db;
        }

        public async Task<IEnumerable<DeviceGroupDto>> GetAllAsync()
        {
            return await _db.DeviceGroups
                .AsNoTracking()
                .Select(g => new DeviceGroupDto
                {
                    Id = g.Id,
                    Name = g.Name,
                    Description = g.Description,
                    DeviceCount = g.Devices.Count
                })
                .ToListAsync();
        }

        public async Task<DeviceGroupDto?> GetByIdAsync(Guid id)
        {
            var g = await _db.DeviceGroups
                .Include(x => x.Devices)
                .FirstOrDefaultAsync(x => x.Id == id);

            if (g == null) return null;

            return new DeviceGroupDto { Id = g.Id, Name = g.Name, Description = g.Description, DeviceCount = g.Devices.Count };
        }

        public async Task<DeviceGroupDto> CreateAsync(CreateDeviceGroupRequest request)
        {
            var group = new SDM.Domain.Entities.DeviceGroup
            {
                Id = Guid.NewGuid(),
                Name = request.Name,
                Description = request.Description
            };

            _db.DeviceGroups.Add(group);
            await _db.SaveChangesAsync();

            return new DeviceGroupDto { Id = group.Id, Name = group.Name, Description = group.Description, DeviceCount = 0 };
        }

        public async Task<DeviceGroupDto?> UpdateAsync(Guid id, UpdateDeviceGroupRequest request)
        {
            var group = await _db.DeviceGroups.FindAsync(id);
            if (group == null) return null;

            group.Name = request.Name;
            group.Description = request.Description;
            await _db.SaveChangesAsync();

            return new DeviceGroupDto { Id = group.Id, Name = group.Name, Description = group.Description };
        }

        public async Task<bool> DeleteAsync(Guid id)
        {
            var group = await _db.DeviceGroups.FindAsync(id);
            if (group == null) return false;

            _db.DeviceGroups.Remove(group);
            await _db.SaveChangesAsync();
            return true;
        }
    }
}
