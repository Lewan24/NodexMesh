using System.Globalization;
using Serilog.Events;
using Serilog.Formatting;
using Serilog.Formatting.Display;

namespace NodexMeshApi.Auditing;

/// <summary>Human-readable console output; structured event properties remain intact in Serilog.</summary>
public sealed class ReadableConsoleFormatter : ITextFormatter
{
    private readonly MessageTemplateTextFormatter standard = new(
        "{Timestamp:yyyy-MM-dd HH:mm:ss.fff zzz} [{Level:u3}] {Message:lj}{NewLine}{Exception}",
        CultureInfo.InvariantCulture);

    public void Format(LogEvent logEvent, TextWriter output)
    {
        string? Value(string name) => logEvent.Properties.TryGetValue(name, out var property)
            && property is ScalarValue { Value: not null } scalar
                ? Convert.ToString(scalar.Value, CultureInfo.InvariantCulture)
                : null;

        // Infrastructure and fallback diagnostics retain their original rendered message.
        var type = Value("EventType");
        var outcome = Value("Outcome");
        if (type is null || outcome is null || Value("AuditId") is null)
        {
            standard.Format(logEvent, output);
            return;
        }

        var level = logEvent.Level switch
        {
            LogEventLevel.Verbose => "VRB", LogEventLevel.Debug => "DBG",
            LogEventLevel.Information => "INF", LogEventLevel.Warning => "WRN",
            LogEventLevel.Error => "ERR", _ => "FTL"
        };
        output.WriteLine($"{logEvent.Timestamp.ToString("yyyy-MM-dd HH:mm:ss.fff zzz", CultureInfo.InvariantCulture)} [{level}] {type} | {outcome}");

        void Line(params (string Label, string Property)[] fields)
        {
            var values = fields.Select(field => (field.Label, Text: Value(field.Property)))
                .Where(field => !string.IsNullOrEmpty(field.Text))
                .Select(field => $"{field.Label}: {field.Text}");
            var line = string.Join("  |  ", values);
            if (line.Length > 0) output.WriteLine("    " + line);
        }

        Line(("Method", "Method"), ("Route", "Route"), ("Status", "StatusCode"));
        Line(("IP", "ClientIp"), ("Actor", "ActorId"), ("Target", "TargetUserId"));
        Line(("Project", "ProjectId"), ("Resource", "ResourceId"), ("Account", "AccountKey"));
        Line(("Request", "RequestId"), ("Trace", "TraceId"));
        Line(("Audit", "AuditId"));
    }
}
