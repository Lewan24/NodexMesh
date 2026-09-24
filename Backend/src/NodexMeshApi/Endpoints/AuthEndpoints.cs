using NodexMeshApi.Auditing;
using System.Security.Claims;
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
        group.MapGet("/registration", RegistrationStatusAsync);
        group.MapPost("/login", LoginAsync).RequireRateLimiting("auth-strict");
        group.MapPost("/refresh", RefreshAsync).RequireRateLimiting("auth-refresh");
        group.MapPost("/revoke", RevokeAsync).RequireAuthorization().RequireRateLimiting("auth-strict");
        group.MapGet("/default-project", GetDefaultProjectAsync).RequireAuthorization();
        group.MapPut("/default-project", SetDefaultProjectAsync).RequireAuthorization();
        group.MapGet("/profile", GetProfileAsync).RequireAuthorization();
        group.MapPut("/profile", UpdateProfileAsync).RequireAuthorization().RequireRateLimiting("auth-strict");
        group.MapPost("/password", ChangePasswordAsync).RequireAuthorization().RequireRateLimiting("auth-strict");
    }

    public sealed record DefaultProjectRequest(Guid? ProjectId);

    private static async Task<Ok<DefaultProjectRequest>> GetDefaultProjectAsync(
        ClaimsPrincipal principal, AppDbContext db, CancellationToken ct)
    {
        var userId = principal.GetUserId();
        var value = await db.UserClaims.Where(c => c.UserId == userId && c.ClaimType == "default_project")
            .Select(c => c.ClaimValue).FirstOrDefaultAsync(ct);
        return TypedResults.Ok(new DefaultProjectRequest(Guid.TryParse(value, out var id) ? id : null));
    }

    private static async Task<NoContent> SetDefaultProjectAsync(
        DefaultProjectRequest request, ClaimsPrincipal principal, AppDbContext db,
        IProjectAccessService access, CancellationToken ct)
    {
        var userId = principal.GetUserId();
        if (request.ProjectId is Guid projectId && await access.GetRoleAsync(projectId, userId, ct) == ProjectRole.None)
            throw new ApiException(404, "not_found", "Project not found.");
        var claims = await db.UserClaims.Where(c => c.UserId == userId && c.ClaimType == "default_project").ToListAsync(ct);
        db.UserClaims.RemoveRange(claims);
        if (request.ProjectId is Guid id)
            db.UserClaims.Add(new IdentityUserClaim<Guid> { UserId = userId, ClaimType = "default_project", ClaimValue = id.ToString() });
        await db.SaveChangesAsync(ct);
        return TypedResults.NoContent();
    }

    private static async Task<Ok<object>> RegistrationStatusAsync(AppDbContext db, CancellationToken ct)
    {
        var enabled = await db.SystemSettings.Select(s => (bool?)s.RegistrationEnabled).SingleOrDefaultAsync(ct) ?? true;
        return TypedResults.Ok<object>(new { enabled });
    }

    private static async Task<Results<Created<RegisteredUserResponse>, ValidationProblem, Conflict<ErrorResponse>>> RegisterAsync(
        RegisterRequest request,
        UserManager<ApplicationUser> userManager,
        AppDbContext db,
        ILogger<Program> logger,
        CancellationToken ct)
    {
        var settings = await db.SystemSettings.AsNoTracking().SingleOrDefaultAsync(ct);
        if (settings is { RegistrationEnabled: false })
            throw new ApiException(403, "registration_disabled", "New account registration is disabled.");

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
        db.AppearanceProfiles.Add(DefaultThemes.CreateProfile(user.Id, DateTimeOffset.UtcNow));
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

        var checkResult = user is not null && !user.IsBlocked
            ? await signInManager.CheckPasswordSignInAsync(user, request.Password, lockoutOnFailure: true)
            : SignInResult.Failed;

        if (user is null || user.IsBlocked || !checkResult.Succeeded)
        {
            // Same generic response whether the email doesn't exist, the password is wrong,
            // or the account is locked out — avoids leaking account state.
            var failure = AuditCapture.Create(http, checkResult.IsLockedOut ? "auth.login_locked" : "auth.login_failed", outcome: "failure", target: user?.Id);
            failure.AccountKey = AuditCapture.AccountKey(request.Email);
            failure.StatusCode = 401;
            http.Items[AuditCapture.ExplicitEvent] = true;
            await http.RequestServices.GetRequiredService<AuditWriter>().WriteAsync(failure);
            return TypedResults.Unauthorized();
        }

        var (accessToken, accessTokenExpiresAtUtc) = tokenService.GenerateAccessToken(user);
        var (refreshToken, hash, expiresAtUtc) = tokenService.GenerateRefreshToken();

        var sessionId = Guid.CreateVersion7();
        db.RefreshTokens.Add(new RefreshToken
        {
            Id = sessionId,
            UserId = user.Id,
            TokenHash = hash,
            ExpiresAtUtc = expiresAtUtc,
            CreatedAtUtc = DateTime.UtcNow,
            CreatedByIp = ClientIpResolver.Resolve(http)
        });
        var login = AuditCapture.Create(http, "auth.login_succeeded", target: user.Id);
        login.ActorId = user.Id;
        login.ResourceId = sessionId.ToString();
        login.Metadata = "{\"authenticationMethod\":\"password\"}";
        login.AccountKey = AuditCapture.AccountKey(request.Email);
        login.StatusCode = 200;
        db.AuditEvents.Add(login);
        await db.SaveChangesAsync();

        http.Items[AuditCapture.ExplicitEvent] = true;
        AuditWriter.Log(logger, login);
        SetRefreshTokenCookie(http, refreshToken, expiresAtUtc, environment);
        return TypedResults.Ok(CreateAuthResponse(user, accessToken, accessTokenExpiresAtUtc));
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

        if (existing is null)
        {
            await RecordRefreshFailure(http, "auth.refresh_invalid");
            return TypedResults.Unauthorized();
        }

        if (existing.RevokedAtUtc is not null)
        {
            // Only a token consumed by rotation has a replacement. Replaying that token is
            // a theft signal, so kill the family. Tokens explicitly revoked by logout,
            // password change or profile change simply fail; a stale browser must not be
            // able to revoke the fresh session created by an account-security operation.
            if (existing.ReplacedByTokenHash is not null)
            {
                var activeTokens = await db.RefreshTokens
                    .Where(r => r.UserId == existing.UserId && r.RevokedAtUtc == null)
                    .ToListAsync();

                foreach (var token in activeTokens) token.RevokedAtUtc = DateTime.UtcNow;
                var reuse = AuditCapture.Create(http, "auth.refresh_reuse", outcome: "blocked", target: existing.UserId);
                reuse.Severity = "Critical";
                reuse.ResourceId = existing.Id.ToString();
                db.AuditEvents.Add(reuse);
                await db.SaveChangesAsync();
                http.Items[AuditCapture.ExplicitEvent] = true;
                AuditWriter.Log(http.RequestServices.GetRequiredService<ILogger<AuditWriter>>(), reuse);
            }
            else await RecordRefreshFailure(http, "auth.refresh_revoked", existing.UserId);

            ClearRefreshTokenCookie(http, environment);
            return TypedResults.Unauthorized();
        }

        if (!existing.IsActive)
        {
            await RecordRefreshFailure(http, "auth.refresh_expired", existing.UserId);
            ClearRefreshTokenCookie(http, environment);
            return TypedResults.Unauthorized();
        }

        var user = await userManager.FindByIdAsync(existing.UserId.ToString());
        if (user is null || user.IsBlocked)
        {
            ClearRefreshTokenCookie(http, environment);
            return TypedResults.Unauthorized();
        }

        // Rotate: the old token is consumed, a new one takes its place.
        existing.RevokedAtUtc = DateTime.UtcNow;
        existing.RevokedByIp = ClientIpResolver.Resolve(http);

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
            CreatedByIp = ClientIpResolver.Resolve(http)
        });
        var rotation = AuditCapture.Create(http, "auth.refresh_rotated", target: user.Id);
        rotation.ActorId = user.Id;
        rotation.ResourceId = existing.Id.ToString();
        db.AuditEvents.Add(rotation);
        try { await db.SaveChangesAsync(); }
        catch (DbUpdateConcurrencyException)
        {
            // Another request consumed this token. Do not claim theft or revoke its winner.
            db.ChangeTracker.Clear();
            await RecordRefreshFailure(http, "auth.refresh_concurrent", user.Id);
            return TypedResults.Unauthorized();
        }
        http.Items[AuditCapture.ExplicitEvent] = true;
        AuditWriter.Log(http.RequestServices.GetRequiredService<ILogger<AuditWriter>>(), rotation);

        SetRefreshTokenCookie(http, newRefreshToken, newExpiresAtUtc, environment);
        return TypedResults.Ok(CreateAuthResponse(user, accessToken, accessTokenExpiresAtUtc));
    }

    private static async Task RecordRefreshFailure(HttpContext http, string type, Guid? target = null)
    {
        http.Items[AuditCapture.ExplicitEvent] = true;
        var audit = AuditCapture.Create(http, type, outcome: "failure", target: target);
        audit.StatusCode = 401;
        await http.RequestServices.GetRequiredService<AuditWriter>().WriteAsync(audit);
    }

    private static async Task<Ok<UserProfileResponse>> GetProfileAsync(
        ClaimsPrincipal principal, UserManager<ApplicationUser> userManager)
    {
        var user = await userManager.FindByIdAsync(principal.GetUserId().ToString())
            ?? throw new ApiException(401, "unauthorized", "The account is no longer available.");
        return TypedResults.Ok(ToProfile(user));
    }

    private static async Task<Ok<AuthResponse>> UpdateProfileAsync(
        UpdateProfileRequest request,
        ClaimsPrincipal principal,
        UserManager<ApplicationUser> userManager,
        ITokenService tokenService,
        AppDbContext db,
        HttpContext http,
        IHostEnvironment environment,
        CancellationToken ct)
    {
        var user = await userManager.FindByIdAsync(principal.GetUserId().ToString())
            ?? throw new ApiException(401, "unauthorized", "The account is no longer available.");
        var email = request.Email.Trim().ToLowerInvariant();
        var displayName = request.DisplayName.Trim();
        if (displayName.Length == 0)
            throw new ApiException(422, "invalid_profile", "Display name is required.");
        var emailChanged = !string.Equals(user.Email, email, StringComparison.OrdinalIgnoreCase);

        if (emailChanged && (string.IsNullOrEmpty(request.CurrentPassword)
            || !await userManager.CheckPasswordAsync(user, request.CurrentPassword)))
            throw new ApiException(400, "invalid_credentials", "The current password is incorrect.");

        var existing = emailChanged ? await userManager.FindByEmailAsync(email) : null;
        if (existing is not null && existing.Id != user.Id)
            throw new ApiException(409, "profile_conflict", "Unable to update the profile with the provided details.");

        user.Email = email;
        user.UserName = email;
        user.DisplayName = displayName;
        var result = await userManager.UpdateAsync(user);
        if (!result.Succeeded)
            throw new ApiException(422, "invalid_profile", string.Join(" ", result.Errors.Select(error => error.Description)));

        if (emailChanged)
            await RotateSessionsAsync(user, tokenService, db, http, environment, ct);
        var (accessToken, expiresAtUtc) = tokenService.GenerateAccessToken(user);
        return TypedResults.Ok(CreateAuthResponse(user, accessToken, expiresAtUtc));
    }

    private static async Task<Ok<AuthResponse>> ChangePasswordAsync(
        ChangePasswordRequest request,
        ClaimsPrincipal principal,
        UserManager<ApplicationUser> userManager,
        ITokenService tokenService,
        AppDbContext db,
        HttpContext http,
        IHostEnvironment environment,
        CancellationToken ct)
    {
        var user = await userManager.FindByIdAsync(principal.GetUserId().ToString())
            ?? throw new ApiException(401, "unauthorized", "The account is no longer available.");
        var result = await userManager.ChangePasswordAsync(user, request.CurrentPassword, request.NewPassword);
        if (!result.Succeeded)
            throw new ApiException(422, "invalid_password", string.Join(" ", result.Errors.Select(error => error.Description)));

        await RotateSessionsAsync(user, tokenService, db, http, environment, ct);
        var (accessToken, accessExpiresAtUtc) = tokenService.GenerateAccessToken(user);
        return TypedResults.Ok(CreateAuthResponse(user, accessToken, accessExpiresAtUtc));
    }

    private static async Task RotateSessionsAsync(
        ApplicationUser user,
        ITokenService tokenService,
        AppDbContext db,
        HttpContext http,
        IHostEnvironment environment,
        CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        var activeTokens = await db.RefreshTokens
            .Where(token => token.UserId == user.Id && token.RevokedAtUtc == null)
            .ToListAsync(ct);
        foreach (var token in activeTokens) token.RevokedAtUtc = now;

        var (refreshToken, hash, refreshExpiresAtUtc) = tokenService.GenerateRefreshToken();
        db.RefreshTokens.Add(new RefreshToken
        {
            Id = Guid.CreateVersion7(),
            UserId = user.Id,
            TokenHash = hash,
            ExpiresAtUtc = refreshExpiresAtUtc,
            CreatedAtUtc = now,
            CreatedByIp = ClientIpResolver.Resolve(http)
        });
        await db.SaveChangesAsync(ct);

        SetRefreshTokenCookie(http, refreshToken, refreshExpiresAtUtc, environment);
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
            Secure = !environment.IsDevelopment() && !environment.IsEnvironment("Testing"),
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
            Secure = !environment.IsDevelopment() && !environment.IsEnvironment("Testing"),
            SameSite = environment.IsDevelopment() ? SameSiteMode.Lax : SameSiteMode.None,
            Path = RefreshTokenCookiePath
        });
    }

    private static AuthResponse CreateAuthResponse(ApplicationUser user, string accessToken, DateTime expiresAtUtc) =>
        new(accessToken, expiresAtUtc, ToProfile(user));

    private static UserProfileResponse ToProfile(ApplicationUser user) =>
        new(user.Id, user.Email!, user.DisplayName, user.IsAdmin);
}

internal static class DefaultThemes
{
    public const string Light = """
        {"primary":"#903df5","secondary":"#ff0000","canvas":"#f5f5f7","default":"#ffffff",
        "accent1":"#6e5fa8","accent2":"#56718f","accent3":"#537f83","accent4":"#66836d","accent5":"#946a6a",
        "gradients":{}}
        """;

    public const string Dark = """
        {"primary":"#903df5","secondary":"#ff0000","canvas":"#0b0b0c","default":"#18181b",
        "accent1":"#8272ba","accent2":"#6984a1","accent3":"#669297","accent4":"#78967f","accent5":"#aa7d7d",
        "gradients":{}}
        """;

    public static AppearanceProfile CreateProfile(Guid userId, DateTimeOffset updatedAt) => new()
    {
        UserId = userId,
        Font = "short-stack",
        UiFont = "sans",
        UiPrimary = "#8000ff",
        UiSecondary = "#6a00eb",
        InheritanceVersion = 1,
        PaletteVersion = 2,
        LightTheme = Light,
        DarkTheme = Dark,
        UpdatedAt = updatedAt
    };
}
