using Microsoft.EntityFrameworkCore;
using NodexMeshApi.Data;

namespace NodexMeshApi.Auditing;

public sealed class AuditHealth
{
    private long failures;
    public long Failures => Interlocked.Read(ref failures);
    public void Failed() => Interlocked.Increment(ref failures);
}

public sealed class AuditWriter(IServiceScopeFactory scopes, ILogger<AuditWriter> logger, AuditHealth health)
{
    public static void Log(ILogger logger, AuditEvent audit) => logger.Log(
        audit.Severity == "Critical" ? LogLevel.Critical : audit.Severity == "Error" ? LogLevel.Error
            : audit.Severity == "Warning" ? LogLevel.Warning : LogLevel.Information,
        new EventId(4100, audit.EventType),
        "Audit {EventType} {Outcome} EventId={AuditId} Actor={ActorId} Target={TargetUserId} Project={ProjectId} IP={ClientIp} Request={RequestId} Trace={TraceId} Resource={ResourceId} Account={AccountKey} Method={Method} Route={Route} Status={StatusCode}",
        audit.EventType, audit.Outcome, audit.Id, audit.ActorId, audit.TargetUserId, audit.ProjectId,
        audit.ClientIp, audit.RequestId, audit.TraceId, audit.ResourceId, audit.AccountKey, audit.Method, audit.Route, audit.StatusCode);

    // Independent context: a failed business change must never be flushed by failure auditing.
    public async Task WriteAsync(AuditEvent audit)
    {
        Log(logger, audit);
        try
        {
            using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(10));
            await using var scope = scopes.CreateAsyncScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            db.AuditEvents.Add(audit);
            await db.SaveChangesAsync(timeout.Token);
        }
        catch (Exception ex)
        {
            health.Failed();
            // Console is the explicit fallback. Never log exception messages containing SQL/parameters.
            logger.LogCritical(new EventId(4199, "audit.persistence_failed"),
                "Audit persistence failed for {AuditId} {EventType}; classification={ExceptionType}. Recover from console collection.",
                audit.Id, audit.EventType, ex.GetType().Name);
        }
    }
}

public sealed class AuditMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext http, AuditWriter writer, ILogger<AuditMiddleware> logger)
    {
        http.Items["audit.middleware"] = true;
        var route = (http.GetEndpoint() as RouteEndpoint)?.RoutePattern.RawText;
        if (route is not null) http.Items["audit.route"] = route;
        foreach (var key in new[] { "projectId", "userId", "id" })
            if (Guid.TryParse(http.Request.RouteValues[key]?.ToString(), out var id)) http.Items["audit." + key] = id;
        try { await next(http); }
        catch (OperationCanceledException) when (http.RequestAborted.IsCancellationRequested) { throw; }
        catch (Exception ex)
        {
            var failure = AuditCapture.Create(http, "http.unhandled_exception", "diagnostic", "failure");
            failure.Severity = "Error";
            failure.StatusCode = 500;
            failure.Metadata = System.Text.Json.JsonSerializer.Serialize(new { exceptionType = ex.GetType().Name });
            await writer.WriteAsync(failure);
            throw;
        }
        if (http.Request.Path == "/health") return;
        var status = http.Response.StatusCode;
        if (status < 500 && http.Items.ContainsKey(AuditCapture.ExplicitEvent)) return;
        string? type = status switch
        {
            400 or 422 => "http.validation_failed",
            401 => "http.unauthenticated",
            403 => "http.forbidden",
            404 when route is null => "http.unmatched",
            405 => "http.method_rejected",
            429 => "http.rate_limited",
            >= 500 => "http.server_error",
            _ => null
        };
        if (type is not null)
        {
            var audit = AuditCapture.Create(http, type, status >= 500 ? "diagnostic" : "security", "denied");
            audit.StatusCode = status;
            if (status >= 500)
            {
                audit.Severity = "Error";
                audit.Metadata = System.Text.Json.JsonSerializer.Serialize(new { exceptionType = http.Items["audit.exceptionType"] as string });
            }
            await writer.WriteAsync(audit);
        }
        else if (status < 300 && route == "/api/v1/auth/revoke")
        {
            await writer.WriteAsync(AuditCapture.Create(http, "auth.logout"));
        }
        else if (status < 300 && route?.StartsWith("/api/v1/admin", StringComparison.Ordinal) == true)
        {
            var audit = AuditCapture.Create(http, "admin.access");
            audit.StatusCode = status;
            await writer.WriteAsync(audit);
        }
        else if (status < 300 && http.Request.Method is "POST" or "PUT" or "PATCH" or "DELETE")
        {
            // Durable entity events are committed by SaveChanges; this is the operation's console summary.
            var audit = AuditCapture.Create(http, "operation.completed", "activity");
            audit.StatusCode = status;
            AuditWriter.Log(logger, audit);
        }
    }
}
