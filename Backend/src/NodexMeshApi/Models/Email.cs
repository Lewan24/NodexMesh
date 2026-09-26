namespace NodexMeshApi.Models;

public sealed class EmailOutboxMessage
{
    public Guid Id { get; set; }
    public string Kind { get; set; } = string.Empty;
    public string ProtectedPayload { get; set; } = string.Empty;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset AvailableAt { get; set; } = DateTimeOffset.UtcNow;
    public int Attempts { get; set; }
    public Guid? LeaseId { get; set; }
    public DateTimeOffset? LockedUntil { get; set; }
    public DateTimeOffset? SentAt { get; set; }
    public DateTimeOffset? DeadLetteredAt { get; set; }
    public string? LastError { get; set; }
}

public sealed class EmailTemplate
{
    public string Key { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string SubjectTemplate { get; set; } = string.Empty;
    public string TextBodyTemplate { get; set; } = string.Empty;
    public string HtmlBodyTemplate { get; set; } = string.Empty;
    public string VariablesCsv { get; set; } = string.Empty;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UnixEpoch;
}

public static class EmailTemplateDefaults
{
    private static readonly DateTimeOffset SeedDate = DateTimeOffset.UnixEpoch;

    public static EmailTemplate[] All =>
    [
        Create("account.confirmation", "Account confirmation", "Sent after registration or a confirmation resend.",
            "Confirm your NodexMesh account",
            "Hello {{display_name}},\n\nConfirm your email address to activate your NodexMesh account.\n\nConfirm account: {{action_url}}\n\nThis link is time-limited.",
            "<h1>Confirm your email</h1><p>Hello {{display_name}},</p><p>Welcome to NodexMesh. Confirm your email address to activate your account.</p><p class=\"action\"><a href=\"{{action_url}}\">Confirm account</a></p><p class=\"muted\">This link is time-limited. If you did not create this account, you can ignore this message.</p>",
            "display_name,action_url"),
        Create("account.email-change-confirmation", "Email change confirmation", "Sent when a signed-in user changes their email address.",
            "Confirm your new NodexMesh email address",
            "Hello {{display_name}},\n\nConfirm this email address to finish updating your NodexMesh account.\n\nConfirm email: {{action_url}}\n\nThis link is time-limited.",
            "<h1>Confirm your new email</h1><p>Hello {{display_name}},</p><p>Confirm this email address to finish updating your NodexMesh account.</p><p class=\"action\"><a href=\"{{action_url}}\">Confirm email</a></p><p class=\"muted\">This link is time-limited.</p>",
            "display_name,action_url"),
        Create("account.password-reset-requested", "Password reset", "Sent after an eligible password-reset request.",
            "Reset your NodexMesh password",
            "Hello {{display_name}},\n\nA password reset was requested for your NodexMesh account.\n\nReset password: {{action_url}}\n\nIf this was not you, ignore this message.",
            "<h1>Reset your password</h1><p>Hello {{display_name}},</p><p>A password reset was requested for your NodexMesh account.</p><p class=\"action\"><a href=\"{{action_url}}\">Reset password</a></p><p class=\"muted\">If this was not you, ignore this message. The link is time-limited.</p>",
            "display_name,action_url"),
        Create("account.password-changed", "Password changed", "Security notice sent after a user or administrator changes a password.",
            "Your NodexMesh password was changed",
            "Hello {{display_name}},\n\nYour NodexMesh password was changed. If you did not make this change, contact your administrator immediately.",
            "<h1>Password changed</h1><p>Hello {{display_name}},</p><p>Your NodexMesh password was changed successfully.</p><div class=\"warning\"><strong>Wasn't you?</strong><br>Contact your administrator immediately.</div>",
            "display_name"),
        Create("project.member-added", "Project access granted", "Sent when a user is added to a project.",
            "You were added to {{project_name}}",
            "Hello {{display_name}},\n\n{{message}}",
            "<h1>Project access granted</h1><p>Hello {{display_name}},</p><p>{{message}}</p><div class=\"detail\"><strong>Project</strong><br>{{project_name}}</div>",
            "display_name,project_name,message"),
        Create("project.member-role-changed", "Project role changed", "Sent when a project member's role changes.",
            "Your access to {{project_name}} changed",
            "Hello {{display_name}},\n\n{{message}}",
            "<h1>Project access updated</h1><p>Hello {{display_name}},</p><p>{{message}}</p><div class=\"detail\"><strong>Project</strong><br>{{project_name}}</div>",
            "display_name,project_name,message"),
        Create("project.member-removed", "Project access removed", "Sent when a user leaves or is removed from a project.",
            "Your access to {{project_name}} was removed",
            "Hello {{display_name}},\n\n{{message}}",
            "<h1>Project access removed</h1><p>Hello {{display_name}},</p><p>{{message}}</p><div class=\"detail\"><strong>Project</strong><br>{{project_name}}</div>",
            "display_name,project_name,message"),
        Create("project.owner-changed", "Project ownership changed", "Sent to affected users after project ownership changes.",
            "Ownership changed for {{project_name}}",
            "Hello {{display_name}},\n\n{{message}}",
            "<h1>Project ownership changed</h1><p>Hello {{display_name}},</p><p>{{message}}</p><div class=\"detail\"><strong>Project</strong><br>{{project_name}}</div>",
            "display_name,project_name,message"),
        Create("account.deletion-requested", "Account deletion requested", "Sent when an account enters the deletion retention period.",
            "Your NodexMesh account is scheduled for deletion",
            "Hello {{display_name}},\n\nYour account was scheduled for deletion. An administrator can restore it for {{retention_days}} days. If you did not request this, contact an administrator immediately.",
            "<h1>Account deletion requested</h1><p>Hello {{display_name}},</p><p>Your account was scheduled for deletion.</p><div class=\"warning\">An administrator can restore it for <strong>{{retention_days}} days</strong>. If you did not request this, contact an administrator immediately.</div>",
            "display_name,retention_days"),
        Create("account.restored", "Account restored", "Sent when an administrator restores an account.",
            "Your NodexMesh account was restored",
            "Hello {{display_name}},\n\nAn administrator restored your NodexMesh account. Project transfers and removed memberships are not automatically reversed.",
            "<h1>Account restored</h1><p>Hello {{display_name}},</p><p>An administrator restored your NodexMesh account.</p><p class=\"muted\">Project transfers and removed memberships are not automatically reversed.</p>",
            "display_name"),
        Create("admin.security-incident", "Critical security incident", "Sent to active administrators for critical detected security incidents.",
            "[{{severity}}] NodexMesh security incident",
            "Hello {{display_name}},\n\nThe security monitor created a {{severity}} incident for rule '{{rule}}'. Review it in the administration audit panel.",
            "<h1>Security incident detected</h1><p>Hello {{display_name}},</p><div class=\"warning\"><strong>Severity:</strong> {{severity}}<br><strong>Rule:</strong> {{rule}}</div><p>Review the incident in the administration audit panel.</p>",
            "display_name,severity,rule"),
        Create("system.test", "Test message", "Sent manually from the email administration panel.",
            "NodexMesh email test",
            "Hello {{display_name}},\n\nEmail delivery is configured correctly. This message was requested from the administration panel.",
            "<h1>Email delivery works</h1><p>Hello {{display_name}},</p><p>Your NodexMesh SMTP configuration successfully delivered this HTML message.</p><div class=\"success\"><strong>Configuration verified</strong><br>You can now use account and project notifications.</div>",
            "display_name")
    ];

    public static EmailTemplate Get(string key) => All.Single(template => template.Key == key);

    private static EmailTemplate Create(
        string key,
        string name,
        string description,
        string subject,
        string text,
        string html,
        string variables) => new()
        {
            Key = key,
            Name = name,
            Description = description,
            SubjectTemplate = subject,
            TextBodyTemplate = text,
            HtmlBodyTemplate = html,
            VariablesCsv = variables,
            UpdatedAt = SeedDate
        };
}
