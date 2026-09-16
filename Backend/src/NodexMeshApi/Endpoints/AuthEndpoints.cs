using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using NodexMeshApi.Common;
using NodexMeshApi.Data;
using NodexMeshApi.Dtos;
using NodexMeshApi.Models;
using NodexMeshApi.Services;

namespace NodexMeshApi.Endpoints;

public static class AuthEndpoints
{
    /// <summary>
    /// Scoped to /api/v1/auth only — the browser won't attach it to board or project
    /// endpoints, shrinking the blast radius if one of those ever had a forwarding bug.
    /// </summary>
    private const string RefreshTokenCookieName = "nodexmesh_refresh_token";
    private const string RefreshTokenCookiePath = "/api/v1/auth";

    public static void MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/auth").WithTags("Auth");

        group.MapPost("/register", RegisterAsync).RequireRateLimiting("auth-strict");
        group.MapPost("/login", LoginAsync).RequireRateLimiting("auth-strict");
        group.MapPost("/refresh", RefreshAsync).RequireRateLimiting("auth-refresh");
        group.MapPost("/revoke", RevokeAsync).RequireAuthorization().RequireRateLimiting("auth-strict");
    }

    private static async Task<Results<Created<RegisteredUserResponse>, ValidationProblem, Conflict<ErrorResponse>>> RegisterAsync(
        RegisterRequest request,
        UserManager<ApplicationUser> userManager,
        AppDbContext db,
        ILogger<Program> logger)
    {
        var existing = await userManager.FindByEmailAsync(request.Email);
        if (existing is not null)
        {
            // Deliberately generic — confirming "this email is already registered" is a
            // user-enumeration vector (OWASP A07).
            return TypedResults.Conflict(new ErrorResponse("Unable to register with the provided details."));
        }

        var user = new ApplicationUser
        {
            Id = Guid.CreateVersion7(),
            UserName = request.Email,
            Email = request.Email,
            DisplayName = request.DisplayName ?? request.Email.Split('@')[0]
        };

        var result = await userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded)
        {
            return TypedResults.ValidationProblem(
                result.Errors.ToDictionary(e => e.Code, e => new[] { e.Description }));
        }

        // Every user starts with a default appearance profile so the SPA always has
        // something to load — mirrors the frontend's `defaults` object.
        db.AppearanceProfiles.Add(new AppearanceProfile
        {
            UserId = user.Id,
            LightTheme = DefaultThemes.Light,
            DarkTheme = DefaultThemes.Dark,
            UpdatedAt = DateTimeOffset.UtcNow
        });
        await db.SaveChangesAsync();

        logger.LogInformation("New user registered: {UserId}", user.Id);
        return TypedResults.Created($"/api/v1/auth/users/{user.Id}", new RegisteredUserResponse(user.Id, user.Email!));
    }

    private static async Task<Results<Ok<AuthResponse>, UnauthorizedHttpResult>> LoginAsync(
        LoginRequest request,
        UserManager<ApplicationUser> userManager,
        SignInManager<ApplicationUser> signInManager,
        ITokenService tokenService,
        AppDbContext db,
        HttpContext http,
        IHostEnvironment environment,
        ILogger<Program> logger)
    {
        var user = await userManager.FindByEmailAsync(request.Email);

        var checkResult = user is not null
            ? await signInManager.CheckPasswordSignInAsync(user, request.Password, lockoutOnFailure: true)
            : SignInResult.Failed;

        if (user is null || !checkResult.Succeeded)
        {
            // Same generic response whether the email doesn't exist, the password is wrong,
            // or the account is locked out — avoids leaking account state.
            logger.LogWarning("Failed login attempt for {Email}", request.Email);
            return TypedResults.Unauthorized();
        }

        var (accessToken, accessTokenExpiresAtUtc) = tokenService.GenerateAccessToken(user);
        var (refreshToken, hash, expiresAtUtc) = tokenService.GenerateRefreshToken();

        db.RefreshTokens.Add(new RefreshToken
        {
            Id = Guid.CreateVersion7(),
            UserId = user.Id,
            TokenHash = hash,
            ExpiresAtUtc = expiresAtUtc,
            CreatedAtUtc = DateTime.UtcNow,
            CreatedByIp = http.Connection.RemoteIpAddress?.ToString()
        });
        await db.SaveChangesAsync();

        SetRefreshTokenCookie(http, refreshToken, expiresAtUtc, environment);
        return TypedResults.Ok(new AuthResponse(accessToken, accessTokenExpiresAtUtc));
    }

    private static async Task<Results<Ok<AuthResponse>, UnauthorizedHttpResult>> RefreshAsync(
        HttpContext http,
        AppDbContext db,
        UserManager<ApplicationUser> userManager,
        ITokenService tokenService,
        IHostEnvironment environment)
    {
        // CSRF guard: this endpoint authenticates purely via cookie, which a plain
        // cross-site <form> POST could otherwise trigger without a preflight. Requiring a
        // custom header forces a CORS preflight, which fails for any origin not in
        // Cors:AllowedOrigins — a bare <form> POST can't set custom headers at all.
        if (http.Request.Headers["X-Requested-With"] != "nodexmesh-web")
            return TypedResults.Unauthorized();

        if (!http.Request.Cookies.TryGetValue(RefreshTokenCookieName, out var refreshToken)
            || string.IsNullOrEmpty(refreshToken))
            return TypedResults.Unauthorized();

        var hash = tokenService.HashToken(refreshToken);
        var existing = await db.RefreshTokens.FirstOrDefaultAsync(r => r.TokenHash == hash);

        if (existing is null) return TypedResults.Unauthorized();

        if (existing.RevokedAtUtc is not null)
        {
            // A previously-used token was presented again — strong signal of theft/replay.
            // Kill the whole refresh-token family so a stolen token can't be used further.
            var activeTokens = await db.RefreshTokens
                .Where(r => r.UserId == existing.UserId && r.RevokedAtUtc == null)
                .ToListAsync();

            foreach (var token in activeTokens) token.RevokedAtUtc = DateTime.UtcNow;
            await db.SaveChangesAsync();

            ClearRefreshTokenCookie(http, environment);
            return TypedResults.Unauthorized();
        }

        if (!existing.IsActive)
        {
            ClearRefreshTokenCookie(http, environment);
            return TypedResults.Unauthorized();
        }

        var user = await userManager.FindByIdAsync(existing.UserId.ToString());
        if (user is null)
        {
            ClearRefreshTokenCookie(http, environment);
            return TypedResults.Unauthorized();
        }

        // Rotate: the old token is consumed, a new one takes its place.
        existing.RevokedAtUtc = DateTime.UtcNow;
        existing.RevokedByIp = http.Connection.RemoteIpAddress?.ToString();

        var (accessToken, accessTokenExpiresAtUtc) = tokenService.GenerateAccessToken(user);
        var (newRefreshToken, newHash, newExpiresAtUtc) = tokenService.GenerateRefreshToken();
        existing.ReplacedByTokenHash = newHash;

        db.RefreshTokens.Add(new RefreshToken
        {
            Id = Guid.CreateVersion7(),
            UserId = user.Id,
            TokenHash = newHash,
            ExpiresAtUtc = newExpiresAtUtc,
            CreatedAtUtc = DateTime.UtcNow,
            CreatedByIp = http.Connection.RemoteIpAddress?.ToString()
        });
        await db.SaveChangesAsync();

        SetRefreshTokenCookie(http, newRefreshToken, newExpiresAtUtc, environment);
        return TypedResults.Ok(new AuthResponse(accessToken, accessTokenExpiresAtUtc));
    }

    private static async Task<NoContent> RevokeAsync(
        HttpContext http, AppDbContext db, ITokenService tokenService, IHostEnvironment environment)
    {
        if (http.Request.Cookies.TryGetValue(RefreshTokenCookieName, out var refreshToken)
            && !string.IsNullOrEmpty(refreshToken))
        {
            var hash = tokenService.HashToken(refreshToken);
            var existing = await db.RefreshTokens.FirstOrDefaultAsync(r => r.TokenHash == hash);

            if (existing is not null && existing.RevokedAtUtc is null)
            {
                existing.RevokedAtUtc = DateTime.UtcNow;
                await db.SaveChangesAsync();
            }
        }

        ClearRefreshTokenCookie(http, environment);
        return TypedResults.NoContent(); // 204 either way — don't reveal whether the token existed
    }

    private static void SetRefreshTokenCookie(
        HttpContext http, string token, DateTime expiresAtUtc, IHostEnvironment environment)
    {
        http.Response.Cookies.Append(RefreshTokenCookieName, token, new CookieOptions
        {
            HttpOnly = true,
            Secure = !environment.IsDevelopment(),
            SameSite = environment.IsDevelopment() ? SameSiteMode.Lax : SameSiteMode.None,
            Path = RefreshTokenCookiePath,
            Expires = expiresAtUtc
        });
    }

    private static void ClearRefreshTokenCookie(HttpContext http, IHostEnvironment environment)
    {
        http.Response.Cookies.Delete(RefreshTokenCookieName, new CookieOptions
        {
            HttpOnly = true,
            Secure = !environment.IsDevelopment(),
            SameSite = environment.IsDevelopment() ? SameSiteMode.Lax : SameSiteMode.None,
            Path = RefreshTokenCookiePath
        });
    }
}

internal static class DefaultThemes
{
    public const string Light = """
        {"primary":"#2b0066","secondary":"#ff00f7","canvas":"#f4f1f9","default":"#ffffff",
        "accent1":"#ede4fa","accent2":"#dceff2","accent3":"#e3f1e4","accent4":"#fff0d5","accent5":"#f8e2eb",
        "gradients":{"default":{"from":"accent1","to":"accent5","angle":120,"kind":"linear"}}}
        """;

    public const string Dark = """
        {"primary":"#5500cc","secondary":"#ff00f7","canvas":"#14101d","default":"#241b30",
        "accent1":"#39264f","accent2":"#163b43","accent3":"#243e2d","accent4":"#463722","accent5":"#482839",
        "gradients":{"default":{"from":"accent1","to":"accent5","angle":120,"kind":"linear"}}}
        """;
}
