namespace SDM.Application.DTOs.Network
{
    public class WifiProfileDto
    {
        public Guid Id { get; set; }
        public string Ssid { get; set; } = string.Empty;
        public string Security { get; set; } = string.Empty;
        public string Band { get; set; } = string.Empty;
        public int DeviceCount { get; set; }
        public bool IsActive { get; set; }
    }

    public class CreateWifiProfileRequest
    {
        public string Ssid { get; set; } = string.Empty;
        public string Security { get; set; } = string.Empty;
        public string Band { get; set; } = string.Empty;
    }

    public class VpnProfileDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Server { get; set; } = string.Empty;
        public string Protocol { get; set; } = string.Empty;
        public int DeviceCount { get; set; }
        public bool IsActive { get; set; }
    }

    public class CreateVpnProfileRequest
    {
        public string Name { get; set; } = string.Empty;
        public string Server { get; set; } = string.Empty;
        public string Protocol { get; set; } = string.Empty;
    }

    public class BlockedDomainDto
    {
        public Guid Id { get; set; }
        public string Domain { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public int BlockedToday { get; set; }
    }

    public class CreateBlockedDomainRequest
    {
        public string Domain { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
    }

    public class AllowedDomainDto
    {
        public Guid Id { get; set; }
        public string Domain { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public string? Description { get; set; }
    }

    public class CreateAllowedDomainRequest
    {
        public string Domain { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public string? Description { get; set; }
    }
}
