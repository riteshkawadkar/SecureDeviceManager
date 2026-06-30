using Google.Apis.AndroidManagement.v1;
using Google.Apis.AndroidManagement.v1.Data;
using Google.Apis.Auth.OAuth2;
using Google.Apis.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SDM.Application.DTOs.Enterprise;
using SDM.Application.Interfaces;
using SDM.Application.Settings;
using SDM.Domain;
using SDM.Infrastructure.Data;
using GoogleEnterprise = Google.Apis.AndroidManagement.v1.Data.Enterprise;
using GoogleDevice = Google.Apis.AndroidManagement.v1.Data.Device;
using GoogleEnrollmentToken = Google.Apis.AndroidManagement.v1.Data.EnrollmentToken;
using Enterprise = SDM.Domain.Entities.Enterprise;
using EnterpriseStatus = SDM.Domain.Entities.EnterpriseStatus;
using LocalDevice = SDM.Domain.Entities.Device;
using EnterpriseEnrollmentToken = SDM.Domain.Entities.EnterpriseEnrollmentToken;

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

        private async Task<Enterprise> GetActiveEnterpriseOrThrowAsync()
        {
            var enterprise = await _db.Enterprises
                .Where(e => e.Status == EnterpriseStatus.Active)
                .OrderByDescending(e => e.CreatedOn)
                .FirstOrDefaultAsync();

            if (enterprise?.GoogleEnterpriseId == null)
                throw new InvalidOperationException("No Active Android Enterprise binding found — complete signup first");

            return enterprise;
        }

        private static string PolicyIdFor(ManagementMode mode) => mode switch
        {
            ManagementMode.AndroidEnterpriseWorkProfile => "work-profile-default",
            ManagementMode.AndroidEnterpriseFullyManaged => "fully-managed-default",
            _ => throw new ArgumentOutOfRangeException(nameof(mode), mode, "Not an Android Enterprise management mode")
        };

        private static Policy BuildPolicy(ManagementMode mode)
        {
            var policy = new Policy
            {
                Applications = new List<ApplicationPolicy>(),
                StatusReportingSettings = new StatusReportingSettings
                {
                    ApplicationReportsEnabled = true,
                    DeviceSettingsEnabled = true,
                    SoftwareInfoEnabled = true,
                    HardwareStatusEnabled = true,
                    MemoryInfoEnabled = true,
                    NetworkInfoEnabled = true,
                    PowerManagementEventsEnabled = true
                }
            };

            // Work Profile (BYOD): personal apps/data are intentionally outside our visibility —
            // PersonalUsagePolicies left at defaults (no personal-side restrictions imposed).
            // Fully Managed devices get no PersonalUsagePolicies at all (not applicable).
            if (mode == ManagementMode.AndroidEnterpriseWorkProfile)
            {
                policy.PersonalUsagePolicies = new PersonalUsagePolicies();
            }

            return policy;
        }

        public async Task<EnrollmentTokenDto> CreateEnrollmentTokenAsync(ManagementMode managementMode)
        {
            if (managementMode == ManagementMode.CustomAgent)
                throw new ArgumentException("CustomAgent devices don't use Android Enterprise enrollment tokens", nameof(managementMode));

            var enterprise = await GetActiveEnterpriseOrThrowAsync();
            var client = BuildClient();

            var policyName = $"{enterprise.GoogleEnterpriseId}/policies/{PolicyIdFor(managementMode)}";
            await client.Enterprises.Policies.Patch(BuildPolicy(managementMode), policyName).ExecuteAsync();

            var tokenRequest = new GoogleEnrollmentToken
            {
                PolicyName = policyName,
                AllowPersonalUsage = managementMode == ManagementMode.AndroidEnterpriseWorkProfile
                    ? "PERSONAL_USAGE_ALLOWED"
                    : "PERSONAL_USAGE_DISALLOWED",
                Duration = "86400s" // 24h provisioning window
            };

            var created = await client.Enterprises.EnrollmentTokens.Create(tokenRequest, enterprise.GoogleEnterpriseId).ExecuteAsync();

            var entity = new EnterpriseEnrollmentToken
            {
                Id = Guid.NewGuid(),
                GoogleTokenName = created.Name,
                Value = created.Value,
                QrCodeJson = created.QrCode,
                ManagementMode = managementMode,
                PolicyName = policyName,
                ExpirationTimestamp = created.ExpirationTimestampDateTimeOffset?.UtcDateTime,
                CreatedOn = DateTime.UtcNow
            };
            _db.EnterpriseEnrollmentTokens.Add(entity);
            await _db.SaveChangesAsync();

            return new EnrollmentTokenDto
            {
                Id = entity.Id,
                Value = entity.Value,
                QrCodeJson = entity.QrCodeJson,
                ManagementMode = entity.ManagementMode,
                ExpirationTimestamp = entity.ExpirationTimestamp,
                CreatedOn = entity.CreatedOn
            };
        }

        public async Task<DeviceSyncResultDto> SyncDevicesAsync()
        {
            var enterprise = await GetActiveEnterpriseOrThrowAsync();
            var client = BuildClient();

            var response = await client.Enterprises.Devices.List(enterprise.GoogleEnterpriseId).ExecuteAsync();
            var googleDevices = response.Devices ?? new List<GoogleDevice>();

            var existingByName = await _db.Devices
                .Where(d => d.GoogleDeviceName != null)
                .ToDictionaryAsync(d => d.GoogleDeviceName!);

            int created = 0, updated = 0;

            foreach (var gd in googleDevices)
            {
                if (existingByName.TryGetValue(gd.Name, out var existing))
                {
                    ApplyGoogleDevice(existing, gd);
                    updated++;
                }
                else
                {
                    var device = new LocalDevice { Id = Guid.NewGuid(), GoogleDeviceName = gd.Name, CreatedOn = DateTime.UtcNow };
                    ApplyGoogleDevice(device, gd);
                    _db.Devices.Add(device);
                    created++;
                }
            }

            await _db.SaveChangesAsync();

            return new DeviceSyncResultDto { TotalFromGoogle = googleDevices.Count, Created = created, Updated = updated };
        }

        private static void ApplyGoogleDevice(LocalDevice device, GoogleDevice gd)
        {
            device.DeviceIdentifier = gd.HardwareInfo?.SerialNumber ?? gd.Name;
            device.SerialNumber = gd.HardwareInfo?.SerialNumber ?? string.Empty;
            device.Manufacturer = gd.HardwareInfo?.Manufacturer ?? string.Empty;
            device.Model = gd.HardwareInfo?.Model ?? string.Empty;
            device.AndroidVersion = gd.SoftwareInfo?.AndroidVersion ?? string.Empty;
            device.ManagementMode = gd.ManagementMode switch
            {
                "PROFILE_OWNER" => ManagementMode.AndroidEnterpriseWorkProfile,
                "DEVICE_OWNER" => ManagementMode.AndroidEnterpriseFullyManaged,
                _ => device.ManagementMode
            };
            device.Status = gd.State == "ACTIVE" ? DeviceStatus.Online : DeviceStatus.Offline;
            device.LastSeen = gd.LastPolicySyncTimeDateTimeOffset?.UtcDateTime ?? device.LastSeen;
            device.UpdatedOn = DateTime.UtcNow;
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
