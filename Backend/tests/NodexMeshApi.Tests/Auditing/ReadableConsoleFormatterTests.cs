using FluentAssertions;
using NodexMeshApi.Auditing;
using Serilog.Events;
using Serilog.Parsing;
using Xunit;

namespace NodexMeshApi.Tests.Auditing;

public class ReadableConsoleFormatterTests
{
    [Fact]
    public void AuditOutput_RendersUsefulContextWithoutNullFieldsOrRawRequestPaths()
    {
        var properties = new Dictionary<string, object?>
        {
            ["EventType"] = "operation.completed", ["Outcome"] = "success", ["AuditId"] = "audit-id",
            ["Method"] = "POST", ["Route"] = "/api/v1/boards/{boardId:guid}/mutations", ["StatusCode"] = 200,
            ["ActorId"] = "actor-id", ["TargetUserId"] = null, ["ProjectId"] = null,
            ["ClientIp"] = "::1", ["RequestId"] = "request-id", ["TraceId"] = "trace-id",
            ["RequestPath"] = "/private-capability-must-not-be-rendered"
        };
        var entry = new LogEvent(DateTimeOffset.Parse("2026-09-24T13:48:58+02:00"), LogEventLevel.Information, null,
            new MessageTemplateParser().Parse("Audit {EventType}"),
            properties.Select(p => new LogEventProperty(p.Key, new ScalarValue(p.Value))));
        using var output = new StringWriter();
        new ReadableConsoleFormatter().Format(entry, output);
        output.ToString().Should().Contain("[INF] operation.completed | success")
            .And.Contain("Status: 200").And.Contain("Actor: actor-id").And.Contain("Request: request-id")
            .And.NotContain("Target:").And.NotContain("Project:").And.NotContain("null")
            .And.NotContain("private-capability").And.NotContain("MessageTemplate");
        entry.Properties.Should().ContainKey("RequestPath", "formatting must not mutate structured events");
    }

    [Fact]
    public void InfrastructureAndPersistenceFailures_KeepTheirRenderedDiagnosticMessages()
    {
        var entry = new LogEvent(DateTimeOffset.UtcNow, LogEventLevel.Fatal, null,
            new MessageTemplateParser().Parse("Audit persistence failed for {AuditId} {EventType}"),
            new[] { new LogEventProperty("AuditId", new ScalarValue("audit-id")),
                new LogEventProperty("EventType", new ScalarValue("auth.login_failed")) });
        using var output = new StringWriter();
        new ReadableConsoleFormatter().Format(entry, output);
        output.ToString().Should().Contain("[FTL] Audit persistence failed for audit-id auth.login_failed");
    }
}
