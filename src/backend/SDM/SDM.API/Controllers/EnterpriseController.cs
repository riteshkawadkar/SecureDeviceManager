using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using SDM.Application.Interfaces;
using SDM.Application.Settings;
using SDM.Domain.Constants;

namespace SDM.API.Controllers
{
    [ApiController]
    [Route("api/enterprise")]
    public class EnterpriseController : ControllerBase
    {
        private readonly IAndroidEnterpriseService _enterpriseService;
        private readonly GoogleEnterpriseSettings _settings;

        public EnterpriseController(IAndroidEnterpriseService enterpriseService, IOptions<GoogleEnterpriseSettings> settings)
        {
            _enterpriseService = enterpriseService;
            _settings = settings.Value;
        }

        [Authorize(Roles = Roles.AdminAndUp)]
        [HttpGet]
        public async Task<IActionResult> GetCurrent()
        {
            var enterprise = await _enterpriseService.GetCurrentEnterpriseAsync();
            if (enterprise == null) return Ok(new { connected = false });
            return Ok(enterprise);
        }

        [Authorize(Roles = Roles.AdminAndUp)]
        [HttpPost("signup")]
        public async Task<IActionResult> Signup()
        {
            var result = await _enterpriseService.CreateSignupUrlAsync();
            return Ok(result);
        }

        // Google redirects the admin's browser here directly after they complete the
        // hosted consent flow — no JWT available, so this endpoint is intentionally
        // anonymous. Google only echoes enterpriseToken back, not signupUrlName, so
        // signupUrlName is optional here and CompleteSignupAsync falls back to the most
        // recent Pending Enterprise row (the one we created ourselves) when it's absent.
        [AllowAnonymous]
        [HttpGet("callback")]
        public async Task<IActionResult> Callback([FromQuery] string enterpriseToken, [FromQuery] string? signupUrlName = null)
        {
            if (string.IsNullOrEmpty(enterpriseToken))
            {
                return Redirect($"{_settings.FrontendRedirectUrl}?enterprise=error");
            }

            try
            {
                var result = await _enterpriseService.CompleteSignupAsync(enterpriseToken, signupUrlName);
                var status = result.Status == SDM.Domain.Entities.EnterpriseStatus.Active ? "connected" : "error";
                return Redirect($"{_settings.FrontendRedirectUrl}?enterprise={status}");
            }
            catch (InvalidOperationException)
            {
                return Redirect($"{_settings.FrontendRedirectUrl}?enterprise=error");
            }
        }
    }
}
