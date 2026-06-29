using SDM.Application.DTOs.Dashboard;

namespace SDM.Application.Interfaces
{
    public interface IDashboardService
    {
        Task<DashboardStatsResponse> GetStatsAsync();
    }
}
