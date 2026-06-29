using Microsoft.EntityFrameworkCore;
using SDM.Application.DTOs.Network;
using SDM.Application.Interfaces;
using SDM.Domain.Entities;
using SDM.Infrastructure.Data;

namespace SDM.Infrastructure.Services
{
    public class NetworkService : INetworkService
    {
        private readonly ApplicationDbContext _db;

        public NetworkService(ApplicationDbContext db)
        {
            _db = db;
        }

        public async Task<IEnumerable<WifiProfileDto>> GetWifiProfilesAsync()
        {
            return await _db.WifiProfiles.AsNoTracking()
                .Select(w => new WifiProfileDto { Id = w.Id, Ssid = w.Ssid, Security = w.Security, Band = w.Band, DeviceCount = w.DeviceCount, IsActive = w.IsActive })
                .ToListAsync();
        }

        public async Task<WifiProfileDto> CreateWifiProfileAsync(CreateWifiProfileRequest request)
        {
            var p = new WifiProfile { Id = Guid.NewGuid(), Ssid = request.Ssid, Security = request.Security, Band = request.Band, IsActive = true };
            _db.WifiProfiles.Add(p);
            await _db.SaveChangesAsync();
            return new WifiProfileDto { Id = p.Id, Ssid = p.Ssid, Security = p.Security, Band = p.Band, DeviceCount = 0, IsActive = p.IsActive };
        }

        public async Task<WifiProfileDto?> ToggleWifiProfileAsync(Guid id)
        {
            var p = await _db.WifiProfiles.FindAsync(id);
            if (p == null) return null;
            p.IsActive = !p.IsActive;
            await _db.SaveChangesAsync();
            return new WifiProfileDto { Id = p.Id, Ssid = p.Ssid, Security = p.Security, Band = p.Band, DeviceCount = p.DeviceCount, IsActive = p.IsActive };
        }

        public async Task<bool> DeleteWifiProfileAsync(Guid id)
        {
            var p = await _db.WifiProfiles.FindAsync(id);
            if (p == null) return false;
            _db.WifiProfiles.Remove(p);
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<IEnumerable<VpnProfileDto>> GetVpnProfilesAsync()
        {
            return await _db.VpnProfiles.AsNoTracking()
                .Select(v => new VpnProfileDto { Id = v.Id, Name = v.Name, Server = v.Server, Protocol = v.Protocol, DeviceCount = v.DeviceCount, IsActive = v.IsActive })
                .ToListAsync();
        }

        public async Task<VpnProfileDto> CreateVpnProfileAsync(CreateVpnProfileRequest request)
        {
            var p = new VpnProfile { Id = Guid.NewGuid(), Name = request.Name, Server = request.Server, Protocol = request.Protocol, IsActive = true };
            _db.VpnProfiles.Add(p);
            await _db.SaveChangesAsync();
            return new VpnProfileDto { Id = p.Id, Name = p.Name, Server = p.Server, Protocol = p.Protocol, DeviceCount = 0, IsActive = p.IsActive };
        }

        public async Task<VpnProfileDto?> ToggleVpnProfileAsync(Guid id)
        {
            var p = await _db.VpnProfiles.FindAsync(id);
            if (p == null) return null;
            p.IsActive = !p.IsActive;
            await _db.SaveChangesAsync();
            return new VpnProfileDto { Id = p.Id, Name = p.Name, Server = p.Server, Protocol = p.Protocol, DeviceCount = p.DeviceCount, IsActive = p.IsActive };
        }

        public async Task<bool> DeleteVpnProfileAsync(Guid id)
        {
            var p = await _db.VpnProfiles.FindAsync(id);
            if (p == null) return false;
            _db.VpnProfiles.Remove(p);
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<IEnumerable<BlockedDomainDto>> GetBlockedDomainsAsync()
        {
            return await _db.BlockedDomains.AsNoTracking()
                .Select(d => new BlockedDomainDto { Id = d.Id, Domain = d.Domain, Category = d.Category, BlockedToday = d.BlockedToday })
                .ToListAsync();
        }

        public async Task<BlockedDomainDto> AddBlockedDomainAsync(CreateBlockedDomainRequest request)
        {
            var d = new BlockedDomain { Id = Guid.NewGuid(), Domain = request.Domain, Category = request.Category };
            _db.BlockedDomains.Add(d);
            await _db.SaveChangesAsync();
            return new BlockedDomainDto { Id = d.Id, Domain = d.Domain, Category = d.Category };
        }

        public async Task<bool> DeleteBlockedDomainAsync(Guid id)
        {
            var d = await _db.BlockedDomains.FindAsync(id);
            if (d == null) return false;
            _db.BlockedDomains.Remove(d);
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<IEnumerable<AllowedDomainDto>> GetAllowedDomainsAsync()
        {
            return await _db.AllowedDomains.AsNoTracking()
                .Select(d => new AllowedDomainDto { Id = d.Id, Domain = d.Domain, Category = d.Category, Description = d.Description })
                .ToListAsync();
        }

        public async Task<AllowedDomainDto> AddAllowedDomainAsync(CreateAllowedDomainRequest request)
        {
            var d = new AllowedDomain { Id = Guid.NewGuid(), Domain = request.Domain, Category = request.Category, Description = request.Description };
            _db.AllowedDomains.Add(d);
            await _db.SaveChangesAsync();
            return new AllowedDomainDto { Id = d.Id, Domain = d.Domain, Category = d.Category, Description = d.Description };
        }

        public async Task<bool> DeleteAllowedDomainAsync(Guid id)
        {
            var d = await _db.AllowedDomains.FindAsync(id);
            if (d == null) return false;
            _db.AllowedDomains.Remove(d);
            await _db.SaveChangesAsync();
            return true;
        }
    }
}
