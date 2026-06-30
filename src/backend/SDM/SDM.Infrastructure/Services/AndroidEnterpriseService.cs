using Google.Apis.AndroidManagement.v1;
using Google.Apis.Auth.OAuth2;
using Google.Apis.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SDM.Application.DTOs.Enterprise;
using SDM.Application.Interfaces;
using SDM.Application.Settings;
using SDM.Infrastructure.Data;
using GoogleEnterprise = Google.Apis.AndroidManagement.v1.Data.Enterprise;
using Enterprise = SDM.Domain.Entities.Enterprise;
using EnterpriseStatus = SDM.Domain.Entities.EnterpriseStatus;

namespace SDM.Infrastructure.Services
{
    public class AndroidEnterpriseService : IAndroidEnterpriseService
    {
        private readonly ApplicationDbContext _db;
        private readonly GoogleEnterpriseSettings _settings;
        private readonly ILogger<AndroidEnterpriseService> _logger;

        public AndroidEnterpriseService(
            ApplicationDbContext db,
            IOptions<GoogleEnterpriseSettings> settings,
            ILogger<AndroidEnterpriseService> logger)
        {
            _db = db;
            _settings = settings.Value;
            _logger = logger;
        }

        private AndroidManagementService BuildClient()
        {
            var credential = GoogleCredential.FromFile(_settings.ServiceAccountPath)
                .CreateScoped(AndroidManagementService.Scope.Androidmanagement);

            return new AndroidManagementService(new BaseClientService.Initializer
            {
                HttpClientInitializer = credential,
                ApplicationName = "SecureDeviceManager"
            });
        }

        public async Task<SignupUrlResponse> CreateSignupUrlAsync()
        {
            var client = BuildClient();

            var request = client.SignupUrls.Create();
            request.ProjectId = _settings.ProjectId;
            request.CallbackUrl = _settings.CallbackUrl;

            var signupUrl = await request.ExecuteAsync();

            var enterprise = new Enterprise
            {
                Id = Guid.NewGuid(),
                SignupUrlName = signupUrl.Name,
                Status = EnterpriseStatus.Pending,
                CreatedOn = DateTime.UtcNow
            };
            _db.Enterprises.Add(enterprise);
            await _db.SaveChangesAsync();

            return new SignupUrlResponse { Url = signupUrl.Url };
        }

        public async Task<EnterpriseDto> CompleteSignupAsync(string enterpriseToken, string? signupUrlNameHint = null)
        {
            // Google's callback redirect only carries enterpriseToken, not signupUrlName —
            // we already have the latter from when we created the signup URL ourselves, so
            // match by it when given (future multi-enterprise support), otherwise fall back
            // to the most recent Pending row (single-tenant: at most one in-flight signup).
            var query = _db.Enterprises.Where(e => e.Status == EnterpriseStatus.Pending);
            if (!string.IsNullOrEmpty(signupUrlNameHint))
            {
                query = query.Where(e => e.SignupUrlName == signupUrlNameHint);
            }

            var pending = await query
                .OrderByDescending(e => e.CreatedOn)
                .FirstOrDefaultAsync();

            if (pending == null)
            {
                throw new InvalidOperationException("No pending Enterprise signup found to complete");
            }

            try
            {
                var client = BuildClient();
                var request = client.Enterprises.Create(new GoogleEnterprise());
                request.ProjectId = _settings.ProjectId;
                request.SignupUrlName = pending.SignupUrlName;
                request.EnterpriseToken = enterpriseToken;

                var created = await request.ExecuteAsync();

                pending.GoogleEnterpriseId = created.Name;
                pending.DisplayName = created.EnterpriseDisplayName;
                pending.Status = EnterpriseStatus.Active;
                pending.UpdatedOn = DateTime.UtcNow;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to complete Android Enterprise signup for {SignupUrlName}", pending.SignupUrlName);
                pending.Status = EnterpriseStatus.Failed;
                pending.ErrorMessage = ex.Message;
                pending.UpdatedOn = DateTime.UtcNow;
            }

            await _db.SaveChangesAsync();
            return ToDto(pending);
        }

        public async Task<EnterpriseDto?> GetCurrentEnterpriseAsync()
        {
            var enterprise = await _db.Enterprises
                .OrderByDescending(e => e.CreatedOn)
                .FirstOrDefaultAsync();

            return enterprise == null ? null : ToDto(enterprise);
        }

        private static EnterpriseDto ToDto(Enterprise e) => new()
        {
            Id = e.Id,
            GoogleEnterpriseId = e.GoogleEnterpriseId,
            DisplayName = e.DisplayName,
            Status = e.Status,
            ErrorMessage = e.ErrorMessage,
            CreatedOn = e.CreatedOn,
            UpdatedOn = e.UpdatedOn
        };
    }
}
