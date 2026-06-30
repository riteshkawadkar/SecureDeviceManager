using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SDM.Application.DTOs.Users;
using SDM.Application.Interfaces;
using SDM.Domain.Constants;

namespace SDM.API.Controllers
{
    [ApiController]
    [Route("api/users")]
    [Authorize(Roles = Roles.AdminAndUp)]
    public class UsersController : ControllerBase
    {
        private readonly IUserService _userService;

        public UsersController(IUserService userService)
        {
            _userService = userService;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            return Ok(await _userService.GetAllAsync());
        }

        [HttpGet("roles")]
        public async Task<IActionResult> GetRoles()
        {
            return Ok(await _userService.GetRolesAsync());
        }

        [HttpGet("{id:guid}")]
        public async Task<IActionResult> GetById([FromRoute] Guid id)
        {
            var user = await _userService.GetByIdAsync(id);
            if (user == null) return NotFound();
            return Ok(user);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateUserRequest request)
        {
            try
            {
                var user = await _userService.CreateAsync(request, User);
                return CreatedAtAction(nameof(GetById), new { id = user.Id }, user);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("{id:guid}")]
        public async Task<IActionResult> Update([FromRoute] Guid id, [FromBody] UpdateUserRequest request)
        {
            try
            {
                var user = await _userService.UpdateAsync(id, request, User);
                if (user == null) return NotFound();
                return Ok(user);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> Delete([FromRoute] Guid id)
        {
            try
            {
                await _userService.DeleteAsync(id, User);
                return NoContent();
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
        }

        [HttpPost("{id:guid}/reset-password")]
        public async Task<IActionResult> ResetPassword([FromRoute] Guid id, [FromBody] ResetPasswordRequest request)
        {
            try
            {
                await _userService.ResetPasswordAsync(id, request);
                return NoContent();
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
        }
    }
}
