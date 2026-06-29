namespace SDM.Domain.Entities
{
    public class WifiProfile
    {
        public Guid Id { get; set; }

        public string Ssid { get; set; } = string.Empty;

        public string Security { get; set; } = string.Empty;

        public string Band { get; set; } = string.Empty;

        public int DeviceCount { get; set; }

        public bool IsActive { get; set; } = true;
    }
}
