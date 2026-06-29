namespace SDM.Application.DTOs.Command
{
    public class BulkCommandRequest
    {
        public List<Guid> DeviceIds { get; set; } = new();
        public string CommandType { get; set; } = string.Empty;
        public string Payload { get; set; } = "{}";
    }

    public class BulkCommandResult
    {
        public int Total { get; set; }
        public int Succeeded { get; set; }
        public int Failed { get; set; }
        public List<BulkCommandDeviceResult> Results { get; set; } = new();
    }

    public class BulkCommandDeviceResult
    {
        public Guid DeviceId { get; set; }
        public bool Success { get; set; }
        public Guid? CommandId { get; set; }
        public string? Error { get; set; }
    }
}
