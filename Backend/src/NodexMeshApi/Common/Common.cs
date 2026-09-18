using System.Security.Claims;
using Microsoft.AspNetCore.Diagnostics;

namespace NodexMeshApi.Common;

/// <summary>
/// Per-project permission level. Ranked so "at least Editor" checks are a simple
/// int comparison. Owner is never stored in project_members — it's implicit from
/// Project.OwnerId — but is represented here so ProjectAccessService can return a
/// single value regardless of whether the caller is the owner or an invited member.
/// </summary>
public enum ProjectRole
{
    None = 0,
    Viewer = 25,
    Commenter = 50,
    Editor = 75,
    Owner = 100
}

/// <summary>
/// Thrown by services for expected, user-facing failures (validation, conflict,
/// not-found, forbidden). Caught centrally by GlobalExceptionHandler and turned into
/// a ProblemDetails response — endpoints don't need their own try/catch for these.
/// </summary>
public sealed class ApiException(int statusCode, string code, string message) : Exception(message)
{
    public int StatusCode { get; } = statusCode;
    public string Code { get; } = code;
}

public record ErrorResponse(string Error);

public static class ClaimsPrincipalExtensions
{
    /// <summary>
    /// Reads the caller's id from the validated access token.
    /// </summary>
    /// <remarks>
    /// Previously each endpoint did <c>Guid.Parse(FindFirstValue(...)!)</c>, which throws
    /// on a token that authenticated but carries no (or a malformed) NameIdentifier —
    /// surfacing as a 500 and an error-log entry an anonymous caller could trigger at will.
    /// A missing subject is an authentication problem, so it returns 401.
    /// </remarks>
    public static Guid GetUserId(this ClaimsPrincipal principal)
    {
        var raw = principal.FindFirstValue(ClaimTypes.NameIdentifier);

        return Guid.TryParse(raw, out var userId)
            ? userId
            : throw new ApiException(401, "unauthorized", "Invalid or missing authentication token.");
    }
}

/// <summary>
/// Converts ApiException into ProblemDetails with the right status code, and anything
/// else into a generic 500 — no stack traces or exception messages reach the client for
/// unexpected errors (OWASP A05: Security Misconfiguration / information disclosure).
/// </summary>
public sealed class GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken ct)
    {
        // A client that disconnects mid-request surfaces as OperationCanceledException.
        // That's normal traffic, not a fault: logging it as an error turns a page refresh
        // into error-log noise and can mask real 500s.
        if (exception is OperationCanceledException && httpContext.RequestAborted.IsCancellationRequested)
            return true;

        // Once the response has started, headers and status are already on the wire —
        // writing again throws inside the handler and kills the connection uncleanly.
        if (httpContext.Response.HasStarted)
        {
            logger.LogError(exception, "Exception after response started on {Path}", httpContext.Request.Path);
            return false;
        }

        var (status, title, detail) = exception switch
        {
            ApiException api => (api.StatusCode, api.Code, api.Message),
            // Anything unexpected is reported generically. The real exception goes to the
            // log, never to the client (OWASP A05 — information disclosure via stack traces).
            _ => (StatusCodes.Status500InternalServerError, "internal_error", "An unexpected error occurred.")
        };

        if (status >= 500)
            logger.LogError(exception, "Unhandled exception on {Path}", httpContext.Request.Path);

        httpContext.Response.StatusCode = status;
        httpContext.Response.ContentType = "application/problem+json";

        await httpContext.Response.WriteAsJsonAsync(new
        {
            type = $"https://httpstatuses.io/{status}",
            title,
            status,
            detail
        }, ct);

        return true;
    }
}

public static class SecurityHeadersMiddlewareExtensions
{
    /// <summary>
    /// Baseline security headers (OWASP secure-headers project). CSP is deliberately
    /// strict — the API only ever returns JSON, so it never needs to allow scripts,
    /// styles, or framing.
    /// </summary>
    public static IApplicationBuilder UseSecurityHeaders(this IApplicationBuilder app) => app.Use(async (context, next) =>
    {
        var path = context.Request.Path;
        var isApi = path.StartsWithSegments("/api");

        void ApplyHeaders()
        {
            var headers = context.Response.Headers;
            headers["X-Content-Type-Options"] = "nosniff";
            headers["X-Frame-Options"] = "DENY";
            headers["Referrer-Policy"] = "no-referrer";
            headers["Permissions-Policy"] = "geolocation=(), camera=(), microphone=()";
            headers["X-Permitted-Cross-Domain-Policies"] = "none";
            headers.Remove("Server");
            headers["Content-Security-Policy"] = isApi
                ? "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"
                : "frame-ancestors 'none'; base-uri 'self'";
            if (isApi)
            {
                headers["Cache-Control"] = path.StartsWithSegments("/api/v1/public")
                    ? "private, max-age=30"
                    : "no-store, no-cache, must-revalidate";
                headers["Pragma"] = "no-cache";
            }
        }

        ApplyHeaders();
        context.Response.OnStarting(() =>
        {
            ApplyHeaders();
            return Task.CompletedTask;
        });

        await next();
    });
}
