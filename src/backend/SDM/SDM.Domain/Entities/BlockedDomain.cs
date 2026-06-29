namespace SDM.Domain.Entities
{
    public class BlockedDomain
    {
        public Guid Id { get; set; }

        public string Domain { get; set; } = string.Empty;

        public string Category { get; set; } = string.Empty;

        public int BlockedToday { get; set; }
    }
}
