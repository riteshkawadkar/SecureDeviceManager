using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SDM.Application.DTOs.Device;
using SDM.Application.Interfaces;
using SDM.Domain.Constants;

namespace SDM.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class DevicesController : ControllerBase
    {
        private readonly IDeviceService _deviceService;
        private readonly IViolationService _violationService;

        public DevicesController(IDeviceService deviceService, IViolationService violationService)
        {
            _deviceService = deviceService;
            _violationService = violationService;
        }

        [AllowAnonymous]
        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] DeviceRegisterRequest request)
        {
            var device = await _deviceService.RegisterAsync(request);
            return CreatedAtAction(nameof(GetById), new { id = device.Id }, device);
        }

        [AllowAnonymous]
        [HttpPost("register-with-token")]
        public async Task<IActionResult> RegisterWithToken([FromBody] DeviceRegisterWithTokenRequest request)
        {
            var resp = await _deviceService.RegisterWithTokenAsync(request);
            return CreatedAtAction(nameof(GetById), new { id = resp.DeviceId }, resp);
        }

        [HttpPost("{id:guid}/heartbeat")]
        public async Task<IActionResult> Heartbeat([FromRoute] Guid id, [FromBody] HeartbeatRequest request)
        {
            try
            {
                await _deviceService.UpdateHeartbeatAsync(id, request);
                return NoContent();
            }
            catch (KeyNotFoundException)
            {
                // Device was removed from management. Signal the agent to unenroll.
                return NotFound(new { message = "Device not found. Please re-enroll." });
            }
        }

        [HttpPost("{id:guid}/push-token")]
        public async Task<IActionResult> RegisterPushToken([FromRoute] Guid id, [FromBody] PushTokenRequest request)
        {
            await _deviceService.RegisterPushTokenAsync(id, request.Token);
            return NoContent();
        }

        [HttpPost("update-fcm-token")]
        public async Task<IActionResult> UpdateFcmToken([FromBody] FcmUpdateRequest request)
        {
            var sub = User?.FindFirst(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)?.Value;
            if (string.IsNullOrEmpty(sub) || !Guid.TryParse(sub, out var deviceId))
                return Unauthorized();

            await _deviceService.RegisterPushTokenAsync(deviceId, request.FcmToken);
            return NoContent();
        }

        public class FcmUpdateRequest
        {
            public string FcmToken { get; set; } = string.Empty;
        }

        [HttpPost("update-management-mode")]
        public async Task<IActionResult> UpdateManagementMode([FromBody] UpdateManagementModeRequest request)
        {
            var sub = User?.FindFirst(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)?.Value;
            if (string.IsNullOrEmpty(sub) || !Guid.TryParse(sub, out var deviceId))
                return Unauthorized();

            try
            {
                await _deviceService.UpdateManagementModeAsync(deviceId, request.ManagementMode);
                return NoContent();
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
        }

        public class UpdateManagementModeRequest
        {
            public SDM.Domain.Enums.ManagementMode ManagementMode { get; set; }
        }

        [Authorize(Roles = Roles.AllRoles)]
        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] string? search,
            [FromQuery] string? status,
            [FromQuery] string? androidVersion,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            if (page > 1 || pageSize != 20 || !string.IsNullOrEmpty(search) || !string.IsNullOrEmpty(status) || !string.IsNullOrEmpty(androidVersion))
            {
                var query = new DeviceQueryParams { Search = search, Status = status, AndroidVersion = androidVersion, Page = page, PageSize = pageSize };
                var paged = await _deviceService.GetPagedAsync(query);
                return Ok(paged);
            }

            var devices = await _deviceService.GetAllAsync();
            return Ok(devices);
        }

        [Authorize(Roles = Roles.AllRoles)]
        [HttpGet("{id:guid}")]
        public async Task<IActionResult> GetById([FromRoute] Guid id)
        {
            var device = await _deviceService.GetByIdAsync(id);
            if (device == null) return NotFound();
            return Ok(device);
        }

        [Authorize(Roles = Roles.AllRoles)]
        [HttpGet("{id:guid}/commands")]
        public async Task<IActionResult> GetCommands([FromRoute] Guid id)
        {
            var commands = await _deviceService.GetCommandsByDeviceAsync(id);
            return Ok(commands);
        }

        [Authorize(Roles = Roles.AllRoles)]
        [HttpGet("{id:guid}/violations")]
        public async Task<IActionResult> GetViolations([FromRoute] Guid id)
        {
            var violations = await _violationService.GetByDeviceAsync(id);
            return Ok(violations);
        }

        [Authorize(Roles = Roles.OperatorAndUp)]
        [HttpPost("{id:guid}/violations")]
        public async Task<IActionResult> AddViolation([FromRoute] Guid id, [FromBody] AddViolationRequest request)
        {
            var violation = await _violationService.AddAsync(id, request.Description);
            return CreatedAtAction(nameof(GetViolations), new { id }, violation);
        }

        [Authorize(Roles = Roles.OperatorAndUp)]
        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> Delete([FromRoute] Guid id)
        {
            try
            {
                await _deviceService.DeleteAsync(id);
                return NoContent();
            }
            catch (Exception ex) when (ex.Message == "Device not found")
            {
                return NotFound();
            }
        }
    }

    public class AddViolationRequest
    {
        public string Description { get; set; } = string.Empty;
    }
}
