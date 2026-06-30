using System.IdentityModel.Tokens.Jwt;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using SDM.Application.DTOs.Auth;
using SDM.Application.DTOs.Users;
using SDM.Application.Interfaces;

namespace SDM.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;
        private readonly IUserService _userService;

        public AuthController(IAuthService authService, IUserService userService)
        {
            _authService = authService;
            _userService = userService;
        }

        [AllowAnonymous]
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            try
            {
                return Ok(await _authService.LoginAsync(request));
            }
            catch (SDM.Application.Exceptions.AuthenticationException ex)
            {
                return Unauthorized(new { message = ex.Message });
            }
        }

        [Authorize]
        [HttpGet("me")]
        public async Task<IActionResult> GetMe()
        {
            var user = await _userService.GetByIdAsync(GetUserId());
            if (user == null) return NotFound();
            return Ok(user);
        }

        [Authorize]
        [HttpPut("me/password")]
        public async Task<IActionResult> ChangeMyPassword([FromBody] ChangePasswordRequest request)
        {
            try
            {
                await _userService.ChangePasswordAsync(GetUserId(), request);
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

        private Guid GetUserId()
        {
            var sub = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
            return Guid.TryParse(sub, out var id) ? id : Guid.Empty;
        }
    }
}
