using System.Diagnostics;
using System.Net;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.EntityFrameworkCore;
using NodexMeshApi.Data;
using NodexMeshApi.Models;

namespace NodexMeshApi.Auditing;

public static class ClientIpResolver
{
    // ForwardedHeadersMiddleware is the only component permitted to consume proxy headers.
    public static string? Resolve(HttpContext? context)
    {
        var ip = context?.Connection.RemoteIpAddress;
        return ip is null ? null : (ip.IsIPv4MappedToIPv6 ? ip.MapToIPv4() : ip).ToString();
    }

    public static void Configure(ForwardedHeadersOptions options, IConfiguration config)
    {
        var proxies = config.GetSection("ReverseProxy:KnownProxies").Get<string[]>() ?? [];
        var networks = config.GetSection("ReverseProxy:KnownNetworks").Get<string[]>() ?? [];
        // No configured trust means no forwarding, including loopback defaults.
        options.ForwardedHeaders = proxies.Length + networks.Length == 0 ? ForwardedHeaders.None
            : ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
        options.KnownProxies.Clear();
        options.KnownIPNetworks.Clear();
        foreach (var proxy in proxies) options.KnownProxies.Add(IPAddress.Parse(proxy));
        foreach (var network in networks)
        {
            var parsed = System.Net.IPNetwork.Parse(network);
            if (parsed.PrefixLength == 0) throw new InvalidOperationException("A catch-all proxy network is unsafe.");
            options.KnownIPNetworks.Add(parsed);
        }
        options.ForwardLimit = config.GetValue("ReverseProxy:ForwardLimit", 1);
        if (options.ForwardLimit is < 1 or > 10) throw new InvalidOperationException("ReverseProxy:ForwardLimit must be 1–10.");
    }
}

public static class AuditCapture
{
    public const string ExplicitEvent = "audit.explicit";
    public static string? Clean(string? value, int length) => value is null ? null
        : new string(value.Where(c => !char.IsControl(c)).Take(length).ToArray());

    public static AuditEvent Create(HttpContext? http, string type, string category = "security",
        string outcome = "success", Guid? target = null)
    {
        var route = (http?.GetEndpoint() as RouteEndpoint)?.RoutePattern.RawText ?? http?.Items["audit.route"] as string;
        return new AuditEvent
        {
            EventType = type, Category = category, Outcome = outcome,
            Severity = outcome == "success" ? "Information" : "Warning",
            ActorId = Guid.TryParse(http?.User.FindFirstValue(ClaimTypes.NameIdentifier), out var actor) ? actor : null,
            TargetUserId = target ?? (Guid.TryParse((http?.Request.RouteValues["userId"] ?? http?.Items["audit.userId"])?.ToString(), out var user) ? user : null),
            ResourceId = Guid.TryParse((http?.Request.RouteValues["id"] ?? http?.Items["audit.id"])?.ToString(), out var resource) ? resource.ToString() : null,
            ProjectId = Guid.TryParse((http?.Request.RouteValues["projectId"] ?? http?.Items["audit.projectId"])?.ToString(), out var project) ? project : null,
            ClientIp = ClientIpResolver.Resolve(http), UserAgent = Clean(http?.Request.Headers.UserAgent, 256),
            Method = Clean(http?.Request.Method, 16), Route = Clean(route ?? "[unmatched]", 256),
            TraceId = Activity.Current?.TraceId.ToString(), RequestId = Clean(http?.TraceIdentifier, 128)
        };
    }

    public static string AccountKey(string email) => Convert.ToHexString(SHA256.HashData(
        Encoding.UTF8.GetBytes((Clean(email, 256) ?? "").Trim().ToUpperInvariant())));

    // Only identifiers, enum/boolean values and property NAMES are eligible. Never serialize entities.
    public static List<AuditEvent> TrackChanges(AppDbContext db, HttpContext? http)
    {
        db.ChangeTracker.DetectChanges();
        var result = new List<AuditEvent>();
        foreach (var entry in db.ChangeTracker.Entries().ToList())
        {
            if (entry.State is not (EntityState.Added or EntityState.Modified or EntityState.Deleted)) continue;
            var entity = entry.Entity;
            if (entity is not (Project or ProjectMember or ProjectShareLink or LibraryAsset or Board
                or ApplicationUser or SystemSettings or RefreshToken)) continue;
            var changes = entry.Properties.Where(p => p.IsModified && !Equals(p.OriginalValue, p.CurrentValue)).ToList();
            if (entry.State == EntityState.Modified && changes.Count == 0) continue;
            if (entity is RefreshToken && entry.State != EntityState.Modified) continue;
            if (entity is RefreshToken && !changes.Any(p => p.Metadata.Name == "RevokedAtUtc")) continue;
            if (entity is ProjectShareLink && entry.State == EntityState.Modified &&
                changes.All(p => p.Metadata.Name is "LastAccessedAt" or "AccessCount")) continue;
            var security = entity is ApplicationUser or SystemSettings or RefreshToken;
            var audit = Create(http, $"{entry.Metadata.ClrType.Name.ToLowerInvariant()}.{entry.State.ToString().ToLowerInvariant()}",
                security ? "security" : "activity");
            if (entity is ApplicationUser && entry.State == EntityState.Modified && changes.Any(p => p.Metadata.Name == "PasswordHash"))
                audit.EventType = http?.Request.Path.StartsWithSegments("/api/v1/admin") == true ? "admin.password_reset" : "auth.password_changed";
            if (entity is RefreshToken) audit.EventType = "auth.session_revoked";
            if (entity is Project && changes.Any(p => p.Metadata.Name == "OwnerId")) audit.EventType = "project.ownership_changed";
            if (entity is ApplicationUser && changes.Any(p => p.Metadata.Name == "IsAdmin")) audit.EventType = "admin.role_changed";
            audit.ResourceType = entry.Metadata.ClrType.Name;
            audit.ResourceId = string.Join(":", entry.Properties.Where(p => p.Metadata.IsPrimaryKey()).Select(p => p.CurrentValue));
            if (entity is Project p) audit.ProjectId = p.Id;
            else if (entry.Metadata.FindProperty("ProjectId") is not null)
                audit.ProjectId = entry.Property("ProjectId").CurrentValue as Guid?;
            if (entity is ApplicationUser u) audit.TargetUserId = u.Id;
            else if (entry.Metadata.FindProperty("UserId") is not null)
                audit.TargetUserId = entry.Property("UserId").CurrentValue as Guid?;
            var safeChanges = (entry.State == EntityState.Added ? entry.Properties : changes).Where(p => p.Metadata.Name is "Role" or "OwnerId" or "IsAdmin" or "IsBlocked"
                or "RegistrationEnabled" or "DeletedAt" or "UserDeletedAt" or "RevokedAt" or "ExpiresAt")
                .ToDictionary(p => p.Metadata.Name, p => new { before = entry.State == EntityState.Added ? null : p.OriginalValue?.ToString(), after = p.CurrentValue?.ToString() });
            audit.Metadata = System.Text.Json.JsonSerializer.Serialize(new { fields = changes.Select(p => p.Metadata.Name), changes = safeChanges });
            result.Add(audit);
        }
        db.AuditEvents.AddRange(result);
        return result;
    }
}
