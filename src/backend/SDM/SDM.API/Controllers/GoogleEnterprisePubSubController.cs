using Google.Apis.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using SDM.Application.Interfaces;
using SDM.Application.Settings;

namespace SDM.API.Controllers
{
    public class PubSubEnvelope
    {
        public PubSubMessage? Message { get; set; }
        public string? Subscription { get; set; }
    }

    public class PubSubMessage
    {
        public string? Data { get; set; }
        public string? MessageId { get; set; }
        public string? PublishTime { get; set; }
    }

    // Receives Google Cloud Pub/Sub push notifications for Android Enterprise device/app/command
    // status changes (ENROLLMENT, STATUS_REPORT, COMMAND, USAGE_LOGS). The subscription must be
    // configured as a push subscription pointing at this endpoint with OIDC token auth enabled —
    // GoogleEnterprise:PubSubAudience must match the audience configured on that subscription.
    [ApiController]
    [Route("api/enterprise/pubsub")]
    public class GoogleEnterprisePubSubController : ControllerBase
    {
        private readonly IAndroidEnterpriseService _enterpriseService;
        private readonly GoogleEnterpriseSettings _settings;
        private readonly ILogger<GoogleEnterprisePubSubController> _logger;

        public GoogleEnterprisePubSubController(
            IAndroidEnterpriseService enterpriseService,
            IOptions<GoogleEnterpriseSettings> settings,
            ILogger<GoogleEnterprisePubSubController> logger)
        {
            _enterpriseService = enterpriseService;
            _settings = settings.Value;
            _logger = logger;
        }

        [AllowAnonymous]
        [HttpPost]
        public async Task<IActionResult> Receive([FromBody] PubSubEnvelope envelope)
        {
            if (string.IsNullOrEmpty(_settings.PubSubAudience))
            {
                _logger.LogWarning("Pub/Sub webhook called but GoogleEnterprise:PubSubAudience is not configured — rejecting");
                return Unauthorized();
            }

            var authHeader = Request.Headers.Authorization.ToString();
            if (!authHeader.StartsWith("Bearer ", StringComparison.Ordinal))
                return Unauthorized();

            try
            {
                await GoogleJsonWebSignature.ValidateAsync(authHeader["Bearer ".Length..], new GoogleJsonWebSignature.ValidationSettings
                {
                    Audience = new[] { _settings.PubSubAudience }
                });
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Pub/Sub webhook: OIDC token validation failed");
                return Unauthorized();
            }

            if (envelope.Message?.Data == null)
                return Ok(); // ack — nothing to process

            try
            {
                var json = System.Text.Encoding.UTF8.GetString(Convert.FromBase64String(envelope.Message.Data));
                using var doc = System.Text.Json.JsonDocument.Parse(json);
                var root = doc.RootElement;
                var notificationType = root.TryGetProperty("notificationType", out var nt) ? nt.GetString() : null;
                var deviceName = root.TryGetProperty("device", out var dn) ? dn.GetString() : null;

                _logger.LogInformation("Pub/Sub webhook: {NotificationType} for {Device}", notificationType, deviceName);

                if (!string.IsNullOrEmpty(deviceName))
                    await _enterpriseService.SyncSingleDeviceAsync(deviceName);
            }
            catch (Exception ex)
            {
                // Still ack (200) — a malformed/unexpected payload shouldn't trigger Google's
                // Pub/Sub retry storm; just log it and move on.
                _logger.LogError(ex, "Pub/Sub webhook: failed to process message");
            }

            return Ok();
        }
    }
}
