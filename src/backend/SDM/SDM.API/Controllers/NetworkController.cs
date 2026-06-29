using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SDM.Application.DTOs.Network;
using SDM.Application.Interfaces;

namespace SDM.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class NetworkController : ControllerBase
    {
        private readonly INetworkService _networkService;

        public NetworkController(INetworkService networkService)
        {
            _networkService = networkService;
        }

        [HttpGet("wifi-profiles")]
        public async Task<IActionResult> GetWifi() => Ok(await _networkService.GetWifiProfilesAsync());

        [HttpPost("wifi-profiles")]
        public async Task<IActionResult> CreateWifi([FromBody] CreateWifiProfileRequest request)
        {
            var result = await _networkService.CreateWifiProfileAsync(request);
            return CreatedAtAction(nameof(GetWifi), result);
        }

        [HttpPatch("wifi-profiles/{id:guid}/toggle")]
        public async Task<IActionResult> ToggleWifi([FromRoute] Guid id)
        {
            var result = await _networkService.ToggleWifiProfileAsync(id);
            if (result == null) return NotFound();
            return Ok(result);
        }

        [HttpDelete("wifi-profiles/{id:guid}")]
        public async Task<IActionResult> DeleteWifi([FromRoute] Guid id)
        {
            var result = await _networkService.DeleteWifiProfileAsync(id);
            if (!result) return NotFound();
            return NoContent();
        }

        [HttpGet("vpn-profiles")]
        public async Task<IActionResult> GetVpn() => Ok(await _networkService.GetVpnProfilesAsync());

        [HttpPost("vpn-profiles")]
        public async Task<IActionResult> CreateVpn([FromBody] CreateVpnProfileRequest request)
        {
            var result = await _networkService.CreateVpnProfileAsync(request);
            return CreatedAtAction(nameof(GetVpn), result);
        }

        [HttpPatch("vpn-profiles/{id:guid}/toggle")]
        public async Task<IActionResult> ToggleVpn([FromRoute] Guid id)
        {
            var result = await _networkService.ToggleVpnProfileAsync(id);
            if (result == null) return NotFound();
            return Ok(result);
        }

        [HttpDelete("vpn-profiles/{id:guid}")]
        public async Task<IActionResult> DeleteVpn([FromRoute] Guid id)
        {
            var result = await _networkService.DeleteVpnProfileAsync(id);
            if (!result) return NotFound();
            return NoContent();
        }

        [HttpGet("domains/blocked")]
        public async Task<IActionResult> GetBlocked() => Ok(await _networkService.GetBlockedDomainsAsync());

        [HttpPost("domains/blocked")]
        public async Task<IActionResult> AddBlocked([FromBody] CreateBlockedDomainRequest request)
        {
            var result = await _networkService.AddBlockedDomainAsync(request);
            return CreatedAtAction(nameof(GetBlocked), result);
        }

        [HttpDelete("domains/blocked/{id:guid}")]
        public async Task<IActionResult> DeleteBlocked([FromRoute] Guid id)
        {
            var result = await _networkService.DeleteBlockedDomainAsync(id);
            if (!result) return NotFound();
            return NoContent();
        }

        [HttpGet("domains/allowed")]
        public async Task<IActionResult> GetAllowed() => Ok(await _networkService.GetAllowedDomainsAsync());

        [HttpPost("domains/allowed")]
        public async Task<IActionResult> AddAllowed([FromBody] CreateAllowedDomainRequest request)
        {
            var result = await _networkService.AddAllowedDomainAsync(request);
            return CreatedAtAction(nameof(GetAllowed), result);
        }

        [HttpDelete("domains/allowed/{id:guid}")]
        public async Task<IActionResult> DeleteAllowed([FromRoute] Guid id)
        {
            var result = await _networkService.DeleteAllowedDomainAsync(id);
            if (!result) return NotFound();
            return NoContent();
        }
    }
}
