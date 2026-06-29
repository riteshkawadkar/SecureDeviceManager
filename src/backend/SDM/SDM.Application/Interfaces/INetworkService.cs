using SDM.Application.DTOs.Network;

namespace SDM.Application.Interfaces
{
    public interface INetworkService
    {
        Task<IEnumerable<WifiProfileDto>> GetWifiProfilesAsync();
        Task<WifiProfileDto> CreateWifiProfileAsync(CreateWifiProfileRequest request);
        Task<WifiProfileDto?> ToggleWifiProfileAsync(Guid id);
        Task<bool> DeleteWifiProfileAsync(Guid id);

        Task<IEnumerable<VpnProfileDto>> GetVpnProfilesAsync();
        Task<VpnProfileDto> CreateVpnProfileAsync(CreateVpnProfileRequest request);
        Task<VpnProfileDto?> ToggleVpnProfileAsync(Guid id);
        Task<bool> DeleteVpnProfileAsync(Guid id);

        Task<IEnumerable<BlockedDomainDto>> GetBlockedDomainsAsync();
        Task<BlockedDomainDto> AddBlockedDomainAsync(CreateBlockedDomainRequest request);
        Task<bool> DeleteBlockedDomainAsync(Guid id);

        Task<IEnumerable<AllowedDomainDto>> GetAllowedDomainsAsync();
        Task<AllowedDomainDto> AddAllowedDomainAsync(CreateAllowedDomainRequest request);
        Task<bool> DeleteAllowedDomainAsync(Guid id);
    }
}
