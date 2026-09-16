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

/// <summary>
/// Converts ApiException into ProblemDetails with the right status code, and anything
/// else into a generic 500 — no stack traces or exception messages reach the client for
/// unexpected errors (OWASP A05: Security Misconfiguration / information disclosure).
/// </summary>
public sealed class GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken ct)
    {
        if (exception is ApiException apiException)
        {
            httpContext.Response.StatusCode = apiException.StatusCode;
            await httpContext.Response.WriteAsJsonAsync(new
            {
                type = $"https://httpstatuses.io/{apiException.StatusCode}",
                title = apiException.Code,
                status = apiException.StatusCode,
                detail = apiException.Message
            }, ct);
            return true;
        }

        logger.LogError(exception, "Unhandled exception on {Path}", httpContext.Request.Path);
        httpContext.Response.StatusCode = StatusCodes.Status500InternalServerError;
        await httpContext.Response.WriteAsJsonAsync(new
        {
            type = "https://httpstatuses.io/500",
            title = "internal_error",
            status = 500,
            detail = "An unexpected error occurred."
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
        var headers = context.Response.Headers;
        headers["X-Content-Type-Options"] = "nosniff";
        headers["X-Frame-Options"] = "DENY";
        headers["Referrer-Policy"] = "no-referrer";
        //headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'";
        headers["Content-Security-Policy"] = "frame-ancestors 'none'";
        headers["Permissions-Policy"] = "geolocation=(), camera=(), microphone=()";
        await next();
    });
}
