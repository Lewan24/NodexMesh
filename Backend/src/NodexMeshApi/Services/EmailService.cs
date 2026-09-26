using System.Net;
using System.Net.Mail;
using System.Net.Mime;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using NodexMeshApi.Common;
using NodexMeshApi.Data;
using NodexMeshApi.Dtos;
using NodexMeshApi.Models;
using NodexMeshApi.Options;

namespace NodexMeshApi.Services;

public sealed record EffectiveEmailSettings(
    bool Enabled,
    bool Configured,
    string Source,
    string Host,
    int Port,
    bool UseSsl,
    string Username,
    string Password,
    string FromAddress,
    string FromName,
    string PublicBaseUrl,
    bool UserNotificationsEnabled,
    bool AdminAlertsEnabled);

public sealed record EmailEnvelope(string Recipient, string Subject, string TextBody, string HtmlBody);

public interface IEmailSettingsService
{
    bool UsesConfiguration { get; }
    Task<EffectiveEmailSettings> GetEffectiveAsync(AppDbContext db, CancellationToken ct = default);
    Task<EmailSettingsDto> GetAdminAsync(AppDbContext db, CancellationToken ct = default);
    Task<EmailSettingsDto> UpdateAsync(AppDbContext db, UpdateEmailSettingsRequest request, CancellationToken ct = default);
}

public sealed class EmailSettingsService(
    IOptions<EmailOptions> configured,
    IDataProtectionProvider dataProtection,
    IHostEnvironment environment,
    ILogger<EmailSettingsService> logger) : IEmailSettingsService
{
    private readonly IDataProtector _passwordProtector = dataProtection.CreateProtector("NodexMesh.Email.SmtpPassword.v1");
    private EmailOptions Configuration => configured.Value;
    public bool UsesConfiguration => !string.IsNullOrWhiteSpace(Configuration.Host);

    public async Task<EffectiveEmailSettings> GetEffectiveAsync(AppDbContext db, CancellationToken ct = default)
    {
        if (UsesConfiguration)
        {
            var value = Configuration;
            var host = value.Host?.Trim() ?? string.Empty;
            var fromAddress = value.FromAddress?.Trim() ?? string.Empty;
            var publicBaseUrl = value.PublicBaseUrl ?? string.Empty;
            var configuredCorrectly = IsComplete(host, value.Port, fromAddress, publicBaseUrl);
            return new EffectiveEmailSettings(
                value.Enabled && configuredCorrectly,
                configuredCorrectly,
                "configuration",
                host,
                value.Port,
                value.UseSsl,
                value.Username?.Trim() ?? string.Empty,
                value.Password ?? string.Empty,
                fromAddress,
                CleanName(value.FromName ?? string.Empty),
                NormalizeBaseUrl(publicBaseUrl, throwOnInvalid: false),
                value.UserNotificationsEnabled,
                value.AdminAlertsEnabled);
        }

        var valueFromDatabase = await db.SystemSettings.AsNoTracking().SingleOrDefaultAsync(ct);
        if (valueFromDatabase is null)
            return Disabled();

        var password = string.Empty;
        if (!string.IsNullOrWhiteSpace(valueFromDatabase.EmailPasswordProtected))
        {
            try
            {
                password = _passwordProtector.Unprotect(valueFromDatabase.EmailPasswordProtected);
            }
            catch (Exception exception) when (exception is System.Security.Cryptography.CryptographicException or FormatException)
            {
                logger.LogError("The database SMTP credential could not be decrypted; email delivery is disabled until an administrator replaces it");
                return Disabled("database");
            }
        }

        var complete = IsComplete(
            valueFromDatabase.EmailHost,
            valueFromDatabase.EmailPort,
            valueFromDatabase.EmailFromAddress,
            valueFromDatabase.EmailPublicBaseUrl);
        return new EffectiveEmailSettings(
            valueFromDatabase.EmailEnabled && complete,
            complete,
            "database",
            valueFromDatabase.EmailHost,
            valueFromDatabase.EmailPort,
            valueFromDatabase.EmailUseSsl,
            valueFromDatabase.EmailUsername,
            password,
            valueFromDatabase.EmailFromAddress,
            CleanName(valueFromDatabase.EmailFromName),
            NormalizeBaseUrl(valueFromDatabase.EmailPublicBaseUrl, throwOnInvalid: false),
            valueFromDatabase.EmailUserNotificationsEnabled,
            valueFromDatabase.EmailAdminAlertsEnabled);
    }

    public async Task<EmailSettingsDto> GetAdminAsync(AppDbContext db, CancellationToken ct = default)
    {
        var settings = await GetEffectiveAsync(db, ct);
        var database = await db.SystemSettings.AsNoTracking().SingleOrDefaultAsync(ct);
        var pending = await db.EmailOutbox.CountAsync(
            message => message.SentAt == null && message.DeadLetteredAt == null,
            ct);
        var failed = await db.EmailOutbox.CountAsync(message => message.DeadLetteredAt != null, ct);
        var hasPassword = UsesConfiguration
            ? !string.IsNullOrEmpty(Configuration.Password)
            : !string.IsNullOrWhiteSpace(database?.EmailPasswordProtected);

        return new EmailSettingsDto(
            settings.Enabled,
            settings.Configured,
            settings.Source,
            !UsesConfiguration,
            settings.Host,
            settings.Port,
            settings.UseSsl,
            settings.Username,
            hasPassword,
            settings.FromAddress,
            settings.FromName,
            settings.PublicBaseUrl,
            settings.UserNotificationsEnabled,
            settings.AdminAlertsEnabled,
            pending,
            failed);
    }

    public async Task<EmailSettingsDto> UpdateAsync(
        AppDbContext db,
        UpdateEmailSettingsRequest request,
        CancellationToken ct = default)
    {
        if (UsesConfiguration)
            throw new ApiException(409, "email_configuration_managed", "Email settings are managed by server configuration.");

        var host = request.Host?.Trim() ?? string.Empty;
        var username = request.Username?.Trim() ?? string.Empty;
        var fromAddress = request.FromAddress?.Trim() ?? string.Empty;
        var fromName = CleanName(request.FromName ?? string.Empty);
        var publicBaseUrl = NormalizeBaseUrl(request.PublicBaseUrl ?? string.Empty, request.Enabled);

        if (request.Enabled && !IsComplete(host, request.Port, fromAddress, publicBaseUrl))
            throw new ApiException(422, "invalid_email_settings", "Host, sender address and public application URL are required when email is enabled.");
        ValidateMailAddress(fromAddress, request.Enabled);

        var settings = await db.SystemSettings.SingleOrDefaultAsync(ct);
        if (settings is null)
        {
            settings = new SystemSettings { Id = 1, RegistrationEnabled = true };
            db.SystemSettings.Add(settings);
        }

        settings.EmailEnabled = request.Enabled;
        settings.EmailHost = host;
        settings.EmailPort = request.Port;
        settings.EmailUseSsl = request.UseSsl;
        settings.EmailUsername = username;
        settings.EmailFromAddress = fromAddress;
        settings.EmailFromName = fromName;
        settings.EmailPublicBaseUrl = publicBaseUrl;
        settings.EmailUserNotificationsEnabled = request.UserNotificationsEnabled;
        settings.EmailAdminAlertsEnabled = request.AdminAlertsEnabled;
        settings.UpdatedAt = DateTimeOffset.UtcNow;

        if (request.ClearPassword)
            settings.EmailPasswordProtected = null;
        else if (request.Password is not null)
            settings.EmailPasswordProtected = request.Password.Length == 0 ? null : _passwordProtector.Protect(request.Password);

        await db.SaveChangesAsync(ct);

        if (!request.Enabled)
        {
            await db.EmailOutbox
                .Where(message => message.SentAt == null && message.DeadLetteredAt == null)
                .ExecuteDeleteAsync(ct);
        }

        return await GetAdminAsync(db, ct);
    }

    private bool IsComplete(string host, int port, string fromAddress, string publicBaseUrl) =>
        !string.IsNullOrWhiteSpace(host) &&
        port is >= 1 and <= 65535 &&
        IsValidMailAddress(fromAddress) &&
        IsValidBaseUrl(publicBaseUrl);

    private bool IsValidBaseUrl(string value)
    {
        if (!Uri.TryCreate(value, UriKind.Absolute, out var uri) || !string.IsNullOrEmpty(uri.UserInfo)) return false;
        return uri.Scheme == Uri.UriSchemeHttps ||
            ((environment.IsDevelopment() || environment.IsEnvironment("Testing")) && uri.Scheme == Uri.UriSchemeHttp);
    }

    private string NormalizeBaseUrl(string value, bool throwOnInvalid)
    {
        var clean = value.Trim().TrimEnd('/');
        if (clean.Length == 0) return string.Empty;
        if (!IsValidBaseUrl(clean))
        {
            if (throwOnInvalid)
                throw new ApiException(422, "invalid_email_settings", "Public application URL must be an absolute HTTPS URL without credentials.");
            return string.Empty;
        }
        return clean;
    }

    private static string CleanName(string value) => value.Replace('\r', ' ').Replace('\n', ' ').Trim();

    private static bool IsValidMailAddress(string value)
    {
        if (string.IsNullOrWhiteSpace(value)) return false;
        try { return new MailAddress(value).Address == value.Trim(); }
        catch (FormatException) { return false; }
    }

    private static void ValidateMailAddress(string value, bool required)
    {
        if (value.Length == 0 && !required) return;
        if (!IsValidMailAddress(value))
            throw new ApiException(422, "invalid_email_settings", "Sender email address is invalid.");
    }

    private static EffectiveEmailSettings Disabled(string source = "database") =>
        new(false, false, source, string.Empty, 587, true, string.Empty, string.Empty, string.Empty, "NodexMesh",
            string.Empty, true, true);
}

public interface IEmailQueue
{
    Task<bool> IsEnabledAsync(AppDbContext db, CancellationToken ct = default);
    Task<bool> QueueTemplateAsync(
        AppDbContext db,
        string templateKey,
        string recipient,
        IReadOnlyDictionary<string, string> values,
          CancellationToken ct = default);
    EmailEnvelope? TryUnprotect(string payload);
    Task<bool> QueueUserTemplateAsync(
        AppDbContext db,
        string templateKey,
        string recipient,
        IReadOnlyDictionary<string, string> values,
        CancellationToken ct = default);
    Task<bool> QueueAdminTemplateAsync(
        AppDbContext db,
        string templateKey,
        string recipient,
        IReadOnlyDictionary<string, string> values,
        CancellationToken ct = default);
}

public sealed class EmailQueue(
    IEmailSettingsService settings,
    IEmailTemplateService templates,
    IDataProtectionProvider dataProtection) : IEmailQueue
{
    private readonly IDataProtector payloadProtector = dataProtection.CreateProtector("NodexMesh.Email.OutboxPayload.v1");

    public async Task<bool> IsEnabledAsync(AppDbContext db, CancellationToken ct = default) =>
        (await settings.GetEffectiveAsync(db, ct)).Enabled;

    public async Task<bool> QueueTemplateAsync(
        AppDbContext db,
        string templateKey,
        string recipient,
        IReadOnlyDictionary<string, string> values,
        CancellationToken ct = default)
    {
        var current = await settings.GetEffectiveAsync(db, ct);
        if (!current.Enabled) return false;
        var message = await templates.RenderAsync(db, templateKey, recipient, values, ct);
        ValidateEnvelope(message);
        db.EmailOutbox.Add(Create(templateKey, message));
        return true;
    }

    public async Task<bool> QueueUserTemplateAsync(
        AppDbContext db,
        string templateKey,
        string recipient,
        IReadOnlyDictionary<string, string> values,
        CancellationToken ct = default)
    {
        var current = await settings.GetEffectiveAsync(db, ct);
        if (!current.Enabled || !current.UserNotificationsEnabled) return false;
        var message = await templates.RenderAsync(db, templateKey, recipient, values, ct);
        ValidateEnvelope(message);
        db.EmailOutbox.Add(Create(templateKey, message));
        return true;
    }

    public async Task<bool> QueueAdminTemplateAsync(
        AppDbContext db,
        string templateKey,
        string recipient,
        IReadOnlyDictionary<string, string> values,
        CancellationToken ct = default)
    {
        var current = await settings.GetEffectiveAsync(db, ct);
        if (!current.Enabled || !current.AdminAlertsEnabled) return false;
        var message = await templates.RenderAsync(db, templateKey, recipient, values, ct);
        ValidateEnvelope(message);
        db.EmailOutbox.Add(Create(templateKey, message));
        return true;
    }

    public EmailEnvelope? TryUnprotect(string payload)
    {
        try
        {
            return JsonSerializer.Deserialize<EmailEnvelope>(payloadProtector.Unprotect(payload));
        }
        catch (Exception exception) when (exception is System.Security.Cryptography.CryptographicException or FormatException or JsonException)
        {
            return null;
        }
    }

    private EmailOutboxMessage Create(string kind, EmailEnvelope message) => new()
    {
        Id = Guid.CreateVersion7(),
        Kind = kind.Length <= 64 ? kind : kind[..64],
        ProtectedPayload = payloadProtector.Protect(JsonSerializer.Serialize(message)),
        CreatedAt = DateTimeOffset.UtcNow,
        AvailableAt = DateTimeOffset.UtcNow
    };

    private static void ValidateEnvelope(EmailEnvelope message)
    {
        try
        {
            if (new MailAddress(message.Recipient).Address != message.Recipient.Trim())
                throw new FormatException();
        }
        catch (FormatException) { throw new ArgumentException("Email recipient is invalid.", nameof(message)); }
        if (message.Subject.Length is 0 or > 200 || message.Subject.IndexOfAny(['\r', '\n']) >= 0 ||
            message.TextBody.Length > 100_000 || message.HtmlBody.Length > 200_000)
            throw new ArgumentException("Email content is outside allowed limits.", nameof(message));
    }
}

public interface IEmailTransport
{
    Task SendAsync(EffectiveEmailSettings settings, EmailEnvelope message, CancellationToken ct);
}

public sealed class SmtpEmailTransport : IEmailTransport
{
    public async Task SendAsync(EffectiveEmailSettings settings, EmailEnvelope message, CancellationToken ct)
    {
        using var mail = CreateMessage(settings, message);

        using var client = new SmtpClient(settings.Host, settings.Port)
        {
            EnableSsl = settings.UseSsl,
            DeliveryMethod = SmtpDeliveryMethod.Network,
            UseDefaultCredentials = false,
            Credentials = string.IsNullOrWhiteSpace(settings.Username)
                ? null
                : new NetworkCredential(settings.Username, settings.Password),
            Timeout = 30_000
        };
        await client.SendMailAsync(mail, ct);
    }

    public static MailMessage CreateMessage(EffectiveEmailSettings settings, EmailEnvelope message)
    {
        var mail = new MailMessage
        {
            From = new MailAddress(settings.FromAddress, settings.FromName),
            Subject = message.Subject,
            SubjectEncoding = Encoding.UTF8,
            Body = message.TextBody,
            BodyEncoding = Encoding.UTF8,
            HeadersEncoding = Encoding.UTF8,
            IsBodyHtml = false
        };
        mail.To.Add(new MailAddress(message.Recipient));
        // A standards-compliant multipart/alternative message: plain text first and HTML
        // last (preferred). Setting an HTML Body and then adding only a text alternate can
        // make some clients expose the HTML source as text.
        mail.AlternateViews.Add(AlternateView.CreateAlternateViewFromString(
            message.TextBody, Encoding.UTF8, MediaTypeNames.Text.Plain));
        mail.AlternateViews.Add(AlternateView.CreateAlternateViewFromString(
            message.HtmlBody, Encoding.UTF8, MediaTypeNames.Text.Html));
        return mail;
    }
}

public sealed class EmailOutboxWorker(
    IServiceScopeFactory scopes,
    IEmailTransport transport,
    ILogger<EmailOutboxWorker> logger) : BackgroundService
{
    private bool disabledQueueCleared;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromSeconds(10));
        do
        {
            try { await ProcessOnceAsync(stoppingToken); }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { break; }
            catch (Exception exception)
            {
                logger.LogError(exception, "Email outbox processing failed; it will retry");
            }
        }
        while (await timer.WaitForNextTickAsync(stoppingToken));
    }

    internal async Task<int> ProcessOnceAsync(CancellationToken ct)
    {
        await using var scope = scopes.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var settingsService = scope.ServiceProvider.GetRequiredService<IEmailSettingsService>();
        var queue = (EmailQueue)scope.ServiceProvider.GetRequiredService<IEmailQueue>();
        var settings = await settingsService.GetEffectiveAsync(db, ct);
        if (!settings.Enabled)
        {
            // Disabled means ignored, not deferred until a future re-enable. This also
            // covers configuration-based disabling, where no admin update runs to clear it.
            if (!disabledQueueCleared)
            {
                await db.EmailOutbox
                    .Where(message => message.SentAt == null && message.DeadLetteredAt == null)
                    .ExecuteDeleteAsync(ct);
                disabledQueueCleared = true;
            }
            return 0;
        }
        disabledQueueCleared = false;

        var now = DateTimeOffset.UtcNow;
        var ids = await db.EmailOutbox.AsNoTracking()
            .Where(message => message.SentAt == null && message.DeadLetteredAt == null && message.AvailableAt <= now &&
                (message.LockedUntil == null || message.LockedUntil < now))
            .OrderBy(message => message.CreatedAt)
            .Select(message => message.Id)
            .Take(10)
            .ToListAsync(ct);
        var processed = 0;

        foreach (var id in ids)
        {
            var lease = Guid.CreateVersion7();
            var claimed = await db.EmailOutbox
                .Where(message => message.Id == id && message.SentAt == null && message.DeadLetteredAt == null &&
                    (message.LockedUntil == null || message.LockedUntil < now))
                .ExecuteUpdateAsync(update => update
                    .SetProperty(message => message.LeaseId, lease)
                    .SetProperty(message => message.LockedUntil, now.AddMinutes(2)), ct);
            if (claimed == 0) continue;

            var entry = await db.EmailOutbox.SingleAsync(message => message.LeaseId == lease, ct);
            try
            {
                var envelope = queue.TryUnprotect(entry.ProtectedPayload)
                    ?? throw new InvalidOperationException("Email payload could not be decrypted.");
                await transport.SendAsync(settings, envelope, ct);
                entry.SentAt = DateTimeOffset.UtcNow;
                entry.LastError = null;
            }
            catch (OperationCanceledException) when (ct.IsCancellationRequested) { throw; }
            catch (Exception exception)
            {
                entry.Attempts++;
                entry.LastError = SafeError(exception);
                if (entry.Attempts >= 8)
                    entry.DeadLetteredAt = DateTimeOffset.UtcNow;
                else
                    entry.AvailableAt = DateTimeOffset.UtcNow.AddMinutes(Math.Min(360, Math.Pow(2, entry.Attempts)));
                logger.LogWarning("Email {EmailId} ({Kind}) delivery attempt {Attempt} failed: {ExceptionType}",
                    entry.Id, entry.Kind, entry.Attempts, exception.GetType().Name);
            }
            finally
            {
                entry.LeaseId = null;
                entry.LockedUntil = null;
                await db.SaveChangesAsync(ct);
            }
            processed++;
        }

        return processed;
    }

    private static string SafeError(Exception exception)
    {
        var value = $"{exception.GetType().Name}: {exception.Message}".Replace('\r', ' ').Replace('\n', ' ');
        return value.Length <= 512 ? value : value[..512];
    }
}

public interface IEmailTemplateService
{
    Task<IReadOnlyList<EmailTemplateDto>> ListAsync(AppDbContext db, CancellationToken ct = default);
    Task<EmailTemplateDto> UpdateAsync(
        AppDbContext db, string key, UpdateEmailTemplateRequest request, CancellationToken ct = default);
    Task<EmailTemplateDto> ResetAsync(AppDbContext db, string key, CancellationToken ct = default);
    Task<EmailTemplatePreviewDto> PreviewAsync(
        AppDbContext db, string key, UpdateEmailTemplateRequest request, CancellationToken ct = default);
    Task<EmailEnvelope> RenderAsync(
        AppDbContext db,
        string key,
        string recipient,
        IReadOnlyDictionary<string, string> values,
        CancellationToken ct = default);
}

public sealed partial class EmailTemplateService : IEmailTemplateService
{
    public async Task<IReadOnlyList<EmailTemplateDto>> ListAsync(AppDbContext db, CancellationToken ct = default) =>
        (await db.EmailTemplates.AsNoTracking().OrderBy(template => template.Name).ToListAsync(ct))
        .Select(ToDto).ToList();

    public async Task<EmailTemplateDto> UpdateAsync(
        AppDbContext db,
        string key,
        UpdateEmailTemplateRequest request,
        CancellationToken ct = default)
    {
        var template = await RequiredAsync(db, key, ct);
        Validate(template, request.Subject, request.TextBody, request.HtmlBody);
        template.SubjectTemplate = request.Subject.Trim();
        template.TextBodyTemplate = request.TextBody.Trim();
        template.HtmlBodyTemplate = request.HtmlBody.Trim();
        template.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);
        return ToDto(template);
    }

    public async Task<EmailTemplateDto> ResetAsync(AppDbContext db, string key, CancellationToken ct = default)
    {
        var template = await RequiredAsync(db, key, ct);
        var defaults = Default(key);
        template.SubjectTemplate = defaults.SubjectTemplate;
        template.TextBodyTemplate = defaults.TextBodyTemplate;
        template.HtmlBodyTemplate = defaults.HtmlBodyTemplate;
        template.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);
        return ToDto(template);
    }

    public async Task<EmailTemplatePreviewDto> PreviewAsync(
        AppDbContext db,
        string key,
        UpdateEmailTemplateRequest request,
        CancellationToken ct = default)
    {
        var template = await RequiredAsync(db, key, ct);
        Validate(template, request.Subject, request.TextBody, request.HtmlBody);
        var rendered = Render(template, "preview@nodexmesh.local", Samples(template),
            request.Subject, request.TextBody, request.HtmlBody);
        return new EmailTemplatePreviewDto(rendered.Subject, rendered.TextBody, rendered.HtmlBody);
    }

    public async Task<EmailEnvelope> RenderAsync(
        AppDbContext db,
        string key,
        string recipient,
        IReadOnlyDictionary<string, string> values,
        CancellationToken ct = default)
    {
        var template = await db.EmailTemplates.AsNoTracking().SingleOrDefaultAsync(entry => entry.Key == key, ct)
            ?? Default(key);
        Validate(template, template.SubjectTemplate, template.TextBodyTemplate, template.HtmlBodyTemplate);
        return Render(template, recipient, values,
            template.SubjectTemplate, template.TextBodyTemplate, template.HtmlBodyTemplate);
    }

    private static EmailEnvelope Render(
        EmailTemplate template,
        string recipient,
        IReadOnlyDictionary<string, string> values,
        string subject,
        string text,
        string html)
    {
        string Replace(string source, bool encode) => Placeholder().Replace(source, match =>
        {
            var key = match.Groups[1].Value;
            if (!values.TryGetValue(key, out var value))
                throw new InvalidOperationException($"Email template '{template.Key}' is missing value '{key}'.");
            return encode ? WebUtility.HtmlEncode(value) : value;
        });

        var renderedSubject = Replace(subject, encode: false).Replace('\r', ' ').Replace('\n', ' ').Trim();
        if (renderedSubject.Length is 0 or > 200)
            throw new InvalidOperationException($"Email template '{template.Key}' produced an invalid subject.");
        return new EmailEnvelope(recipient, renderedSubject, Replace(text, encode: false), WrapHtml(Replace(html, encode: true)));
    }

    private static void Validate(EmailTemplate template, string subject, string text, string html)
    {
        var allowed = Variables(template).ToHashSet(StringComparer.Ordinal);
        foreach (var source in new[] { subject, text, html })
            foreach (Match match in Placeholder().Matches(source))
                if (!allowed.Contains(match.Groups[1].Value))
                    throw new ApiException(422, "invalid_email_template",
                        $"Variable '{match.Value}' is not available for this template.");

        if (subject.IndexOfAny(['\r', '\n']) >= 0)
            throw new ApiException(422, "invalid_email_template", "The subject must be a single line.");
        if (DangerousHtml().IsMatch(html))
            throw new ApiException(422, "invalid_email_template",
                "Scripts, forms, embedded frames, event handlers and executable URLs are not allowed in email templates.");
    }

    private static async Task<EmailTemplate> RequiredAsync(AppDbContext db, string key, CancellationToken ct) =>
        await db.EmailTemplates.SingleOrDefaultAsync(template => template.Key == key, ct)
        ?? throw new ApiException(404, "email_template_not_found", "Email template not found.");

    private static EmailTemplate Default(string key)
    {
        try { return EmailTemplateDefaults.Get(key); }
        catch (InvalidOperationException) { throw new ApiException(404, "email_template_not_found", "Email template not found."); }
    }

    private static EmailTemplateDto ToDto(EmailTemplate template) => new(
        template.Key,
        template.Name,
        template.Description,
        template.SubjectTemplate,
        template.TextBodyTemplate,
        template.HtmlBodyTemplate,
        Variables(template),
        template.UpdatedAt);

    private static IReadOnlyList<string> Variables(EmailTemplate template) =>
        template.VariablesCsv.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

    private static Dictionary<string, string> Samples(EmailTemplate template) => Variables(template)
        .ToDictionary(variable => variable, variable => variable switch
        {
            "display_name" => "Alex Morgan",
            "action_url" => "https://nodexmesh.example.com/?action=preview",
            "project_name" => "Product roadmap",
            "message" => "You now have Editor access to this project.",
            "retention_days" => "90",
            "severity" => "Critical",
            "rule" => "auth.refresh_reuse",
            _ => $"[{variable}]"
        });

    private static string WrapHtml(string content) => """
        <!doctype html>
        <html lang="en">
        <head>
          <meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
          <style>h1{font-size:26px;line-height:1.25;margin:0 0 20px;color:#251b36}p{margin:0 0 18px}.action{margin:28px 0}.action a{display:inline-block;background:#7c3aed;color:#fff!important;text-decoration:none;font-weight:700;padding:13px 22px;border-radius:10px}.muted{color:#70677f;font-size:14px}.detail,.warning,.success{padding:16px 18px;border-radius:12px;margin:20px 0}.detail{background:#f4f0fb;border:1px solid #e5dcf5}.warning{background:#fff7e8;border:1px solid #f4d79c}.success{background:#ecfdf5;border:1px solid #a7e5ca}</style>
        </head>
        <body style="margin:0;background:#f4f2f8;color:#272334;font-family:Arial,Helvetica,sans-serif;padding:32px 12px">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border:1px solid #e5e0ee;border-radius:20px;overflow:hidden;box-shadow:0 10px 30px rgba(48,35,72,.08)">
              <tr><td style="padding:24px 32px;background:linear-gradient(135deg,#6d28d9,#8b5cf6);color:#fff;font-size:20px;font-weight:700;letter-spacing:.4px">NodexMesh</td></tr>
              <tr><td style="padding:32px;font-size:16px;line-height:1.65">
        """ + content + """
              </td></tr>
              <tr><td style="padding:18px 32px;border-top:1px solid #eee8f5;color:#81778f;font-size:12px">This is an automated message from NodexMesh.</td></tr>
            </table>
          </td></tr></table>
        </body></html>
        """;

    [GeneratedRegex(@"\{\{([a-z0-9_]+)\}\}", RegexOptions.CultureInvariant)]
    private static partial Regex Placeholder();

    [GeneratedRegex(@"<\s*(script|iframe|object|embed|form)\b|javascript\s*:|data\s*:\s*text/html|\son[a-z]+\s*=", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant)]
    private static partial Regex DangerousHtml();
}
