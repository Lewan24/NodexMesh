using System.ComponentModel.DataAnnotations;

namespace NodexMeshApi.Dtos;

public sealed record EmailSettingsDto(
    bool Enabled,
    bool Configured,
    string Source,
    bool Editable,
    string Host,
    int Port,
    bool UseSsl,
    string Username,
    bool HasPassword,
    string FromAddress,
    string FromName,
    string PublicBaseUrl,
    bool UserNotificationsEnabled,
    bool AdminAlertsEnabled,
    int PendingMessages,
    int FailedMessages);

public sealed record UpdateEmailSettingsRequest(
    bool Enabled,
    [property: MaxLength(255)] string? Host,
    [property: Range(1, 65535)] int Port,
    bool UseSsl,
    [property: MaxLength(255)] string? Username,
    [property: MaxLength(1024)] string? Password,
    bool ClearPassword,
    [property: EmailAddress, MaxLength(256)] string? FromAddress,
    [property: MaxLength(100)] string? FromName,
    [property: MaxLength(2048)] string? PublicBaseUrl,
    bool UserNotificationsEnabled,
    bool AdminAlertsEnabled);

public sealed record ConfirmEmailRequest(Guid UserId, [property: Required, MaxLength(8192)] string Token);

public sealed record ForgotPasswordRequest([property: Required, EmailAddress, MaxLength(256)] string Email);

public sealed record ResetPasswordRequest(
    Guid UserId,
    [property: Required, MaxLength(8192)] string Token,
    [property: Required, MinLength(12)] string Password,
    [property: Required] string ConfirmPassword) : IValidatableObject
{
    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (Password != ConfirmPassword)
            yield return new ValidationResult("Passwords do not match.", [nameof(ConfirmPassword)]);
    }
}

public sealed record EmailTemplateDto(
    string Key,
    string Name,
    string Description,
    string Subject,
    string TextBody,
    string HtmlBody,
    IReadOnlyList<string> Variables,
    DateTimeOffset UpdatedAt);

public sealed record UpdateEmailTemplateRequest(
    [property: Required, MaxLength(200)] string Subject,
    [property: Required, MaxLength(100_000)] string TextBody,
    [property: Required, MaxLength(200_000)] string HtmlBody);

public sealed record EmailTemplatePreviewDto(string Subject, string TextBody, string HtmlBody);

public sealed record EmailOutboxMessageDto(
    Guid Id, string Kind, string Status, string Recipient, Guid? UserId,
    string? UserDisplayName, string Subject, int Attempts,
    DateTimeOffset CreatedAt, DateTimeOffset AvailableAt,
    DateTimeOffset? SentAt, DateTimeOffset? DeadLetteredAt, string? LastError);

public sealed record EmailOutboxResponse(
    IReadOnlyList<EmailOutboxMessageDto> Items, int PendingMessages, int FailedMessages);
