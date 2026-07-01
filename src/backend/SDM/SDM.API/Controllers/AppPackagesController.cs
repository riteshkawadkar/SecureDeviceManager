using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.FileProviders;
using SDM.Application.DTOs.AppPackage;
using SDM.Application.Interfaces;
using SDM.Domain.Constants;

namespace SDM.API.Controllers
{
    [ApiController]
    [Route("api/app-packages")]
    [Authorize(Roles = Roles.AllRoles)]
    public class AppPackagesController : ControllerBase
    {
        private readonly IAppPackageService _appPackageService;
        private readonly IWebHostEnvironment _env;

        public AppPackagesController(IAppPackageService appPackageService, IWebHostEnvironment env)
        {
            _appPackageService = appPackageService;
            _env = env;
        }

        private Guid? ActorUserId
        {
            get
            {
                var sub = User.FindFirst(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)?.Value;
                return Guid.TryParse(sub, out var id) ? id : null;
            }
        }

        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] string? search, [FromQuery] int page = 1, [FromQuery] int pageSize = 50)
        {
            var result = await _appPackageService.GetAllAsync(search, page, pageSize);
            return Ok(result);
        }

        [HttpGet("{id:guid}")]
        public async Task<IActionResult> GetById([FromRoute] Guid id)
        {
            var app = await _appPackageService.GetByIdAsync(id);
            if (app == null) return NotFound();
            return Ok(app);
        }

        [Authorize(Roles = Roles.AdminAndUp)]
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateAppPackageRequest request)
        {
            var app = await _appPackageService.CreateAsync(request);
            return CreatedAtAction(nameof(GetById), new { id = app.Id }, app);
        }

        [Authorize(Roles = Roles.AdminAndUp)]
        [HttpPut("{id:guid}")]
        public async Task<IActionResult> Update([FromRoute] Guid id, [FromBody] UpdateAppPackageRequest request)
        {
            var app = await _appPackageService.UpdateAsync(id, request);
            if (app == null) return NotFound();
            return Ok(app);
        }

        [Authorize(Roles = Roles.AdminAndUp)]
        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> Delete([FromRoute] Guid id)
        {
            var result = await _appPackageService.DeleteAsync(id);
            if (!result) return NotFound();
            return NoContent();
        }

        [Authorize(Roles = Roles.OperatorAndUp)]
        [HttpPost("{id:guid}/install")]
        public async Task<IActionResult> PushInstall([FromRoute] Guid id, [FromBody] PushInstallRequest request)
        {
            var result = await _appPackageService.PushInstallAsync(id, request, ActorUserId);
            return Ok(result);
        }

        [Authorize(Roles = Roles.OperatorAndUp)]
        [HttpPost("{id:guid}/uninstall")]
        public async Task<IActionResult> PushUninstall([FromRoute] Guid id, [FromBody] PushInstallRequest request)
        {
            var result = await _appPackageService.PushUninstallAsync(id, request, ActorUserId);
            return Ok(result);
        }

        [HttpGet("{id:guid}/installations")]
        public async Task<IActionResult> GetInstallations([FromRoute] Guid id)
        {
            var result = await _appPackageService.GetInstallationsAsync(id);
            return Ok(result);
        }

        [Authorize(Roles = Roles.AdminAndUp)]
        [HttpPost("upload-apk")]
        [RequestSizeLimit(200 * 1024 * 1024)]
        [RequestFormLimits(MultipartBodyLengthLimit = 200 * 1024 * 1024)]
        public async Task<IActionResult> UploadApk(IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest(new { message = "No file provided." });
            if (!file.FileName.EndsWith(".apk", StringComparison.OrdinalIgnoreCase))
                return BadRequest(new { message = "Only .apk files are allowed." });

            var uploadsDir = Path.Combine(_env.ContentRootPath, "uploads", "apks");
            Directory.CreateDirectory(uploadsDir);

            var filename = $"{Guid.NewGuid()}{Path.GetExtension(file.FileName)}";
            var filePath = Path.Combine(uploadsDir, filename);

            using var stream = System.IO.File.Create(filePath);
            await file.CopyToAsync(stream);

            var baseUrl = $"{Request.Scheme}://{Request.Host}";
            return Ok(new { url = $"{baseUrl}/uploads/apks/{filename}" });
        }
    }
}
