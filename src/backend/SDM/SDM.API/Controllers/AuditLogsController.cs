using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SDM.Application.Interfaces;

namespace SDM.API.Controllers
{
    [ApiController]
    [Route("api/audit-logs")]
    [Authorize]
    public class AuditLogsController : ControllerBase
    {
        private readonly IAuditLogService _auditLogService;

        public AuditLogsController(IAuditLogService auditLogService)
        {
            _auditLogService = auditLogService;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] string? entityName,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            var result = await _auditLogService.GetAllAsync(entityName, page, pageSize);
            return Ok(result);
        }
    }
}
