using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SDM.Application.DTOs.AppPackage;
using SDM.Application.Interfaces;
using SDM.Domain.Constants;

namespace SDM.API.Controllers
{
    [ApiController]
    [Route("api/devices/{deviceId:guid}/installed-apps")]
    public class DeviceInventoryController : ControllerBase
    {
        private readonly IDeviceInventoryService _inventoryService;

        public DeviceInventoryController(IDeviceInventoryService inventoryService)
        {
            _inventoryService = inventoryService;
        }

        [Authorize(Roles = "Device")]
        [HttpPost]
        public async Task<IActionResult> Report([FromRoute] Guid deviceId, [FromBody] ReportInstalledAppsRequest request)
        {
            await _inventoryService.ReportInstalledAppsAsync(deviceId, request);
            return NoContent();
        }

        [Authorize(Roles = Roles.AllRoles)]
        [HttpGet]
        public async Task<IActionResult> GetAll([FromRoute] Guid deviceId, [FromQuery] int page = 1, [FromQuery] int pageSize = 200)
        {
            var result = await _inventoryService.GetInstalledAppsAsync(deviceId, page, pageSize);
            return Ok(result);
        }
    }
}
