using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using NodexMeshApi.Models;

namespace NodexMeshApi.Services;

public interface ITokenService
{
    (string Token, DateTime ExpiresAtUtc) GenerateAccessToken(ApplicationUser user);
    (string Token, string Hash, DateTime ExpiresAtUtc) GenerateRefreshToken();
    string HashToken(string token);
}

/// <summary>
/// Access tokens carry only identity claims (sub/email/jti) — no project roles. Project
/// permissions are checked fresh from project_members on every request instead (see
/// ProjectAccessService), so revoking a collaborator takes effect immediately rather
/// than waiting for their 15-minute access token to expire.
/// </summary>
public sealed class TokenService(IConfiguration configuration) : ITokenService
{
    public (string Token, DateTime ExpiresAtUtc) GenerateAccessToken(ApplicationUser user)
    {
        var jwtSection = configuration.GetSection("Jwt");
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSection["Key"]!));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Email, user.Email ?? string.Empty)
        };

        var expiresMinutes = double.TryParse(jwtSection["AccessTokenMinutes"], out var m) ? m : 15;
        var expiresAtUtc = DateTime.UtcNow.AddMinutes(expiresMinutes);

        var token = new JwtSecurityToken(
            issuer: jwtSection["Issuer"],
            audience: jwtSection["Audience"],
            claims: claims,
            expires: expiresAtUtc,
            signingCredentials: credentials);

        return (new JwtSecurityTokenHandler().WriteToken(token), expiresAtUtc);
    }

    public (string Token, string Hash, DateTime ExpiresAtUtc) GenerateRefreshToken()
    {
        var randomBytes = RandomNumberGenerator.GetBytes(64); // 512-bit CSPRNG output
        var token = Convert.ToBase64String(randomBytes);
        var hash = HashToken(token);
        var expiresAtUtc = DateTime.UtcNow.AddDays(7);

        return (token, hash, expiresAtUtc);
    }

    public string HashToken(string token)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(token));
        return Convert.ToHexString(bytes);
    }
}
