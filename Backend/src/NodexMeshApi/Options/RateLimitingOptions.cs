namespace NodexMeshApi.Options;

public sealed class RateLimitingOptions
{
    public int IpRequestsPerMinute { get; set; } = 2000;
    public int UserRequestsPerMinute { get; set; } = 1000;
    public int AuthRequestsPerMinute { get; set; } = 5;
    public int RefreshRequestsPerMinute { get; set; } = 120;
    public int GateRequestsPerMinute { get; set; } = 10000;
}
