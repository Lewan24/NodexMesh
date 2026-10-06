using System.Buffers.Binary;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;
using NodexMeshApi.Common;
using NodexMeshApi.Data;
using NodexMeshApi.Dtos;
using NodexMeshApi.Models;

namespace NodexMeshApi.Services;

public sealed class MfaService(
    AppDbContext db,
    IDataProtectionProvider protection,
    IEmailQueue email,
    TimeProvider clock,
    IOptions<IdentityOptions>? identityOptions = null)
{
    private readonly IDataProtector protector = protection.CreateProtector("NodexMesh.Mfa.Secret.v1");
    public DateTimeOffset Now => clock.GetUtcNow();
    public string Protect(string value) => protector.Protect(value);
    public static string Hash(string value) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(value)));

    public async Task<MfaChallengeResponse> StartAsync(ApplicationUser user, string purpose,
        bool targetEnabled = false, string targetMethod = "email", CancellationToken ct = default)
    {
        if (purpose == "manage" && targetEnabled && targetMethod == "email" && !await email.IsEnabledAsync(db, ct))
            throw new ApiException(409, "email_unavailable", "Email MFA is unavailable. Choose an authenticator app.");
        if (purpose == "manage" && !targetEnabled && !user.TwoFactorEnabled)
            throw new ApiException(409, "mfa_already_disabled", "MFA is already disabled.");
        var method = user.TwoFactorEnabled ? user.MfaPreferredMethod : targetMethod;
        // If mail is disabled, an enrolled authenticator remains usable. Never bypass MFA.
        if (method == "email" && !await email.IsEnabledAsync(db, ct))
        {
            if (user.MfaSecretProtected is not null) method = "authenticator";
            else method = "recovery";
        }
        var token = Convert.ToHexString(RandomNumberGenerator.GetBytes(32));
        var challenge = new MfaChallenge
        {
            Id = Guid.CreateVersion7(), UserId = user.Id, TokenHash = Hash(token),
            SecurityStamp = user.SecurityStamp!, Purpose = purpose, Method = method,
            TargetEnabled = targetEnabled, TargetMethod = targetMethod, ExpiresAt = Now.AddMinutes(5)
        };
        string? secret = null;
        if (purpose == "manage" && targetEnabled && targetMethod == "authenticator" && user.MfaSecretProtected is null)
        {
            secret = Base32(RandomNumberGenerator.GetBytes(20));
            challenge.SetupSecretProtected = Protect(secret);
        }
        if (method == "email" || (purpose == "manage" && targetEnabled && targetMethod == "email"))
        {
            var code = RandomNumberGenerator.GetInt32(0, 1_000_000).ToString("D6");
            challenge.EmailCodeHash = Protect(Hash(token + ":" + code));
            if (!await email.QueueTemplateAsync(db, "account.mfa-code", user.Email!, new Dictionary<string, string>
                { ["display_name"] = user.DisplayName, ["code"] = code, ["expires_minutes"] = "5" }, ct))
                throw new ApiException(409, "email_unavailable", "Email MFA is unavailable.");
        }
        // Supersede pending challenges of the same purpose, including old emailed codes.
        foreach (var previous in await db.MfaChallenges.Where(x => x.UserId == user.Id && x.Purpose == purpose && !x.Consumed).ToListAsync(ct))
            previous.Consumed = true;
        db.MfaChallenges.Add(challenge);
        await db.SaveChangesAsync(ct);
        var uri = secret is null ? null : $"otpauth://totp/{Uri.EscapeDataString("NodexMesh:" + user.Email)}?secret={secret}&issuer=NodexMesh&algorithm=SHA1&digits=6&period=30";
        return new(true, token, method, challenge.ExpiresAt, secret, uri);
    }

    public async Task<(ApplicationUser User, MfaChallenge Challenge)> VerifyAsync(
        MfaCompleteRequest request, string purpose, Guid? userId = null, CancellationToken ct = default)
    {
        var tokenHash = Hash(request.ChallengeToken);
        var challenge = await db.MfaChallenges.SingleOrDefaultAsync(x => x.TokenHash == tokenHash, ct);
        if (challenge is null || challenge.Purpose != purpose || challenge.Consumed || challenge.ExpiresAt <= Now ||
            challenge.Attempts >= 5 || (userId is not null && challenge.UserId != userId)) throw Invalid();
        var user = await db.Users.SingleOrDefaultAsync(x => x.Id == challenge.UserId, ct);
        if (user is null || user.IsBlocked || user.SecurityStamp != challenge.SecurityStamp ||
            user.LockoutEnd > Now) throw Invalid();
        challenge.Attempts++;
        var valid = false;
        var recoveryHash = Hash(user.Id + ":" + request.Code.Trim().ToUpperInvariant());
        var recovery = user.TwoFactorEnabled
            ? await db.MfaRecoveryCodes.SingleOrDefaultAsync(x => x.UserId == user.Id && x.CodeHash == recoveryHash && !x.Consumed, ct)
            : null;
        if (recovery is not null)
        {
            recovery.Consumed = true;
            valid = true;
        }
        else if (challenge.Method == "email")
            valid = await email.IsEnabledAsync(db, ct) && CheckEmail(challenge, request.ChallengeToken, request.Code);
        else
        {
            var protectedSecret = user.MfaSecretProtected ?? challenge.SetupSecretProtected;
            if (protectedSecret is not null)
            {
                var step = MatchStep(protector.Unprotect(protectedSecret), request.Code, Now, user.MfaLastAcceptedStep);
                valid = step is not null;
                if (valid) user.MfaLastAcceptedStep = step;
            }
        }
        if (valid && purpose == "manage" && challenge.TargetEnabled)
        {
            if (challenge.TargetMethod == "email" && challenge.Method != "email")
                valid = await email.IsEnabledAsync(db, ct) && CheckEmail(challenge, request.ChallengeToken, request.SetupCode ?? "");
            if (challenge.TargetMethod == "authenticator" && challenge.SetupSecretProtected is not null && user.TwoFactorEnabled)
            {
                var step = MatchStep(protector.Unprotect(challenge.SetupSecretProtected), request.SetupCode ?? "", Now, null);
                valid = step is not null;
                if (valid) user.MfaLastAcceptedStep = step;
            }
        }
        if (!valid)
        {
            // Persist attempt counts, but do not consume a recovery code or TOTP on partial proof.
            if (recovery is not null)
            {
                db.Entry(recovery).CurrentValues.SetValues(db.Entry(recovery).OriginalValues);
                db.Entry(recovery).State = EntityState.Unchanged;
            }
            db.Entry(user).CurrentValues.SetValues(db.Entry(user).OriginalValues);
            var lockout = identityOptions?.Value.Lockout ?? new LockoutOptions();
            user.AccessFailedCount++;
            if (user.AccessFailedCount >= lockout.MaxFailedAccessAttempts)
            {
                user.LockoutEnd = Now.Add(lockout.DefaultLockoutTimeSpan);
                user.AccessFailedCount = 0;
            }
            user.ConcurrencyStamp = Guid.NewGuid().ToString();
            await SaveAsync(ct);
            throw Invalid();
        }
        challenge.Consumed = true;
        user.AccessFailedCount = 0;
        user.ConcurrencyStamp = Guid.NewGuid().ToString();
        await SaveAsync(ct);
        return (user, challenge);
    }

    private bool CheckEmail(MfaChallenge challenge, string token, string code) =>
        challenge.EmailCodeHash is not null && code.Length == 6 &&
        CryptographicOperations.FixedTimeEquals(Encoding.ASCII.GetBytes(protector.Unprotect(challenge.EmailCodeHash)),
            Encoding.ASCII.GetBytes(Hash(token + ":" + code)));

    private async Task SaveAsync(CancellationToken ct)
    {
        try { await db.SaveChangesAsync(ct); }
        catch (DbUpdateConcurrencyException) { throw Invalid(); }
    }

    public static ApiException Invalid() => new(401, "invalid_mfa", "The verification code is invalid or expired.");

    public async Task<string[]> ReplaceRecoveryCodesAsync(ApplicationUser user, CancellationToken ct)
    {
        db.MfaRecoveryCodes.RemoveRange(await db.MfaRecoveryCodes.Where(x => x.UserId == user.Id).ToListAsync(ct));
        var codes = Enumerable.Range(0, 10).Select(_ => Convert.ToHexString(RandomNumberGenerator.GetBytes(10))).ToArray();
        db.MfaRecoveryCodes.AddRange(codes.Select(code => new MfaRecoveryCode
            { Id = Guid.CreateVersion7(), UserId = user.Id, CodeHash = Hash(user.Id + ":" + code) }));
        return codes;
    }

    // RFC 6238: SHA-1, six digits, thirty seconds; allow one adjacent step for clock drift.
    public static long? MatchStep(string secret, string code, DateTimeOffset now, long? lastStep)
    {
        if (code.Length != 6 || code.Any(c => c < '0' || c > '9')) return null;
        var current = now.ToUnixTimeSeconds() / 30;
        for (var step = current - 1; step <= current + 1; step++)
        {
            if (lastStep is not null && step <= lastStep) continue;
            if (CryptographicOperations.FixedTimeEquals(Encoding.ASCII.GetBytes(Totp(secret, step)), Encoding.ASCII.GetBytes(code))) return step;
        }
        return null;
    }

    public static string Totp(string secret, long step)
    {
        Span<byte> counter = stackalloc byte[8];
        BinaryPrimitives.WriteInt64BigEndian(counter, step);
        var hash = HMACSHA1.HashData(DecodeBase32(secret), counter);
        var offset = hash[^1] & 15;
        var number = BinaryPrimitives.ReadInt32BigEndian(hash.AsSpan(offset, 4)) & 0x7fffffff;
        return (number % 1_000_000).ToString("D6");
    }

    private const string Alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    public static string Base32(byte[] bytes)
    {
        var result = new StringBuilder();
        var buffer = 0;
        var bits = 0;
        foreach (var value in bytes)
        {
            buffer = (buffer << 8) | value;
            bits += 8;
            while (bits >= 5)
            {
                bits -= 5;
                result.Append(Alphabet[(buffer >> bits) & 31]);
            }
        }
        if (bits > 0) result.Append(Alphabet[(buffer << (5 - bits)) & 31]);
        return result.ToString();
    }

    private static byte[] DecodeBase32(string secret)
    {
        var result = new List<byte>();
        var buffer = 0;
        var bits = 0;
        foreach (var value in secret)
        {
            var digit = Alphabet.IndexOf(value);
            if (digit < 0) throw new FormatException("Invalid authenticator secret.");
            buffer = (buffer << 5) | digit;
            bits += 5;
            if (bits >= 8)
            {
                bits -= 8;
                result.Add((byte)(buffer >> bits));
            }
        }
        return result.ToArray();
    }
}
