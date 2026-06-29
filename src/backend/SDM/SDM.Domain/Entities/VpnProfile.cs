namespace SDM.Domain.Entities
{
    public class VpnProfile
    {
        public Guid Id { get; set; }

        public string Name { get; set; } = string.Empty;

        public string Server { get; set; } = string.Empty;

        public string Protocol { get; set; } = string.Empty;

        public int DeviceCount { get; set; }

        public bool IsActive { get; set; } = true;
    }
}
