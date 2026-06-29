namespace SDM.Application.DTOs.Dashboard
{
    public class DashboardStatsResponse
    {
        public int TotalDevices { get; set; }
        public int OnlineDevices { get; set; }
        public int OfflineDevices { get; set; }
        public int ActivePolicies { get; set; }
        public double ComplianceRate { get; set; }
        public List<OsDistributionItem> OsDistribution { get; set; } = new();
        public List<RecentActivityItem> RecentActivity { get; set; } = new();
    }

    public class OsDistributionItem
    {
        public string Version { get; set; } = string.Empty;
        public int Count { get; set; }
    }

    public class RecentActivityItem
    {
        public Guid DeviceId { get; set; }
        public string DeviceIdentifier { get; set; } = string.Empty;
        public string Action { get; set; } = string.Empty;
        public DateTime Timestamp { get; set; }
    }
}
