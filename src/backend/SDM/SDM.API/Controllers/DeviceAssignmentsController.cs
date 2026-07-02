using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SDM.Application.DTOs.DeviceAssignment;
using SDM.Application.Interfaces;
using SDM.Domain.Constants;
using System.Security.Claims;

namespace SDM.API.Controllers
{
    [ApiController]
    [Route("api/devices/{deviceId:guid}/assignment")]
    [Authorize(Roles = Roles.AllRoles)]
    public class DeviceAssignmentsController : ControllerBase
    {
        private readonly IDeviceAssignmentService _assignmentService;

        public DeviceAssignmentsController(IDeviceAssignmentService assignmentService)
        {
            _assignmentService = assignmentService;
        }

        [HttpGet]
        public async Task<IActionResult> Get([FromRoute] Guid deviceId)
        {
            var dto = await _assignmentService.GetByDeviceIdAsync(deviceId);
            if (dto == null) return NotFound();
            return Ok(dto);
        }

        [Authorize(Roles = Roles.AdminAndUp)]
        [HttpPut]
        public async Task<IActionResult> Assign([FromRoute] Guid deviceId, [FromBody] AssignDeviceRequest request)
        {
            var assignedBy = User.FindFirstValue(ClaimTypes.Email)
                ?? User.FindFirstValue(ClaimTypes.Name)
                ?? "unknown";
            var dto = await _assignmentService.AssignAsync(deviceId, request, assignedBy);
            return Ok(dto);
        }

        [Authorize(Roles = Roles.AdminAndUp)]
        [HttpDelete]
        public async Task<IActionResult> Unassign([FromRoute] Guid deviceId)
        {
            var result = await _assignmentService.UnassignAsync(deviceId);
            if (!result) return NotFound();
            return NoContent();
        }
    }
}
