namespace SDM.Application.DTOs.DeviceGroup
{
    public class DeviceGroupDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string? Category { get; set; }
        public int DeviceCount { get; set; }
    }

    public class CreateDeviceGroupRequest
    {
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string? Category { get; set; }
    }

    public class UpdateDeviceGroupRequest
    {
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string? Category { get; set; }
    }
}
