using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SDM.Application.DTOs.Command;
using SDM.Application.Interfaces;
using SDM.Domain.Constants;
using System.Text.Json;

namespace SDM.API.Controllers
{
    [ApiController]
    [Route("api/commands")]
    [Authorize(Roles = Roles.OperatorAndUp)]
    public class BulkCommandsController : ControllerBase
    {
        private readonly ICommandService _commandService;

        public BulkCommandsController(ICommandService commandService)
        {
            _commandService = commandService;
        }

        public class BulkCreateRequest
        {
            public List<Guid> DeviceIds { get; set; } = new();
            public string CommandType { get; set; } = string.Empty;
            public JsonElement Payload { get; set; }
        }

        [HttpPost("bulk")]
        public async Task<IActionResult> CreateBulk([FromBody] BulkCreateRequest request)
        {
            if (request.DeviceIds == null || request.DeviceIds.Count == 0)
                return BadRequest("DeviceIds cannot be empty.");

            if (string.IsNullOrWhiteSpace(request.CommandType))
                return BadRequest("CommandType is required.");

            var payloadStr = request.Payload.ValueKind == JsonValueKind.String
                ? request.Payload.GetString() ?? "{}"
                : request.Payload.ValueKind == JsonValueKind.Undefined ? "{}"
                : request.Payload.ToString();

            var sub = User.FindFirst(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)?.Value;
            Guid? actorUserId = Guid.TryParse(sub, out var actorId) ? actorId : null;

            var result = await _commandService.CreateBulkCommandAsync(request.DeviceIds, request.CommandType, payloadStr, actorUserId);
            return Ok(result);
        }
    }
}
