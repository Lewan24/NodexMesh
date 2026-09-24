namespace NodexMeshApi.Auditing;

// Historical identifiers deliberately have no foreign keys: deletion must not erase evidence.
public sealed class AuditEvent
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public DateTime OccurredAt { get; set; } = DateTime.UtcNow;
    public string Category { get; set; } = "security";
    public string EventType { get; set; } = "";
    public string Severity { get; set; } = "Information";
    public string Outcome { get; set; } = "success";
    public Guid? ActorId { get; set; }
    public Guid? TargetUserId { get; set; }
    public Guid? ProjectId { get; set; }
    public string? ResourceType { get; set; }
    public string? ResourceId { get; set; }
    public string? ClientIp { get; set; }
    public string? UserAgent { get; set; }
    public string? Method { get; set; }
    public string? Route { get; set; }
    public int? StatusCode { get; set; }
    public string? TraceId { get; set; }
    public string? RequestId { get; set; }
    public string? AccountKey { get; set; }
    public string Metadata { get; set; } = "{}";
}

public sealed class SecurityIncident
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public string Rule { get; set; } = "";
    public string Subject { get; set; } = "";
    public DateTime WindowStart { get; set; }
    public string Severity { get; set; } = "Warning";
    public string Status { get; set; } = "open";
    public Guid EventId { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public Guid? ReviewedBy { get; set; }
}

public sealed class AuditOptions
{
    public int SecurityRetentionDays { get; set; } = 180;
    public int ActivityRetentionDays { get; set; } = 90;
    public int DiagnosticRetentionDays { get; set; } = 30;
    public int IncidentRetentionDays { get; set; } = 365;
    public int WindowMinutes { get; set; } = 10;
    public int FailedLoginThreshold { get; set; } = 5;
    public int DistinctAccountsThreshold { get; set; } = 5;
    public int DistinctIpsThreshold { get; set; } = 3;
    public int ForbiddenThreshold { get; set; } = 10;
    public int NotFoundThreshold { get; set; } = 20;
    public int RateLimitThreshold { get; set; } = 10;
}

public sealed class AuditDetectionCheckpoint
{
    public int Id { get; set; } = 1;
    public DateTime ProcessedThrough { get; set; }
}
