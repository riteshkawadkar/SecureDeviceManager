using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SDM.Application.DTOs.DeviceGroup;
using SDM.Application.Interfaces;
using SDM.Domain.Constants;

namespace SDM.API.Controllers
{
    [ApiController]
    [Route("api/device-groups")]
    [Authorize(Roles = Roles.AllRoles)]
    public class DeviceGroupsController : ControllerBase
    {
        private readonly IDeviceGroupService _groupService;

        public DeviceGroupsController(IDeviceGroupService groupService)
        {
            _groupService = groupService;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var groups = await _groupService.GetAllAsync();
            return Ok(groups);
        }

        [HttpGet("{id:guid}")]
        public async Task<IActionResult> GetById([FromRoute] Guid id)
        {
            var group = await _groupService.GetByIdAsync(id);
            if (group == null) return NotFound();
            return Ok(group);
        }

        [Authorize(Roles = Roles.AdminAndUp)]
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateDeviceGroupRequest request)
        {
            var group = await _groupService.CreateAsync(request);
            return CreatedAtAction(nameof(GetById), new { id = group.Id }, group);
        }

        [Authorize(Roles = Roles.AdminAndUp)]
        [HttpPut("{id:guid}")]
        public async Task<IActionResult> Update([FromRoute] Guid id, [FromBody] UpdateDeviceGroupRequest request)
        {
            var group = await _groupService.UpdateAsync(id, request);
            if (group == null) return NotFound();
            return Ok(group);
        }

        [Authorize(Roles = Roles.AdminAndUp)]
        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> Delete([FromRoute] Guid id)
        {
            var result = await _groupService.DeleteAsync(id);
            if (!result) return NotFound();
            return NoContent();
        }
    }
}
