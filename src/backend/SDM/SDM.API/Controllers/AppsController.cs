using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SDM.Application.DTOs.App;
using SDM.Application.Interfaces;
using SDM.Domain.Constants;
using SDM.Domain.Entities;

namespace SDM.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = Roles.AllRoles)]
    public class AppsController : ControllerBase
    {
        private readonly IAppService _appService;

        public AppsController(IAppService appService)
        {
            _appService = appService;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] AppStatus? status,
            [FromQuery] string? category,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 50)
        {
            var result = await _appService.GetAllAsync(status, category, page, pageSize);
            return Ok(result);
        }

        [HttpGet("{id:guid}")]
        public async Task<IActionResult> GetById([FromRoute] Guid id)
        {
            var app = await _appService.GetByIdAsync(id);
            if (app == null) return NotFound();
            return Ok(app);
        }

        [Authorize(Roles = Roles.AdminAndUp)]
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateAppRequest request)
        {
            var app = await _appService.CreateAsync(request);
            return CreatedAtAction(nameof(GetById), new { id = app.Id }, app);
        }

        [Authorize(Roles = Roles.AdminAndUp)]
        [HttpPut("{id:guid}")]
        public async Task<IActionResult> Update([FromRoute] Guid id, [FromBody] UpdateAppRequest request)
        {
            var app = await _appService.UpdateAsync(id, request);
            if (app == null) return NotFound();
            return Ok(app);
        }

        [Authorize(Roles = Roles.AdminAndUp)]
        [HttpPatch("{id:guid}/approve")]
        public async Task<IActionResult> Approve([FromRoute] Guid id)
        {
            var app = await _appService.SetStatusAsync(id, AppStatus.Approved);
            if (app == null) return NotFound();
            return Ok(app);
        }

        [Authorize(Roles = Roles.AdminAndUp)]
        [HttpPatch("{id:guid}/revoke")]
        public async Task<IActionResult> Revoke([FromRoute] Guid id)
        {
            var app = await _appService.SetStatusAsync(id, AppStatus.Blocked);
            if (app == null) return NotFound();
            return Ok(app);
        }

        [Authorize(Roles = Roles.AdminAndUp)]
        [HttpPatch("{id:guid}/deny")]
        public async Task<IActionResult> Deny([FromRoute] Guid id)
        {
            var app = await _appService.SetStatusAsync(id, AppStatus.Blocked);
            if (app == null) return NotFound();
            return Ok(app);
        }

        [Authorize(Roles = Roles.AdminAndUp)]
        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> Delete([FromRoute] Guid id)
        {
            var result = await _appService.DeleteAsync(id);
            if (!result) return NotFound();
            return NoContent();
        }
    }
}
