namespace SDM.Domain.Entities
{
    public class AllowedDomain
    {
        public Guid Id { get; set; }

        public string Domain { get; set; } = string.Empty;

        public string Category { get; set; } = string.Empty;

        public string? Description { get; set; }
    }
}
