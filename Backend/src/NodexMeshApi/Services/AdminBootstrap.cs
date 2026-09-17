using System.Security.Cryptography;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using NodexMeshApi.Data;
using NodexMeshApi.Endpoints;
using NodexMeshApi.Models;

namespace NodexMeshApi.Services;

public static class AdminBootstrap
{
    public static async Task EnsureAsync(IServiceProvider services, IConfiguration configuration, ILogger logger)
    {
        var users = services.GetRequiredService<UserManager<ApplicationUser>>();
        var db = services.GetRequiredService<AppDbContext>();
        var email = configuration["Admin:Email"]?.Trim().ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(email))
            throw new InvalidOperationException("Admin:Email must be configured.");

        var admin = await users.FindByEmailAsync(email);
        if (admin is null)
        {
            var password = configuration["Admin:Password"] ?? string.Empty;
            var generated = string.IsNullOrWhiteSpace(password);
            password = generated ? GeneratePassword() : password;
            admin = new ApplicationUser
            {
                Id = Guid.CreateVersion7(), UserName = email, Email = email, DisplayName = "Administrator",
                IsAdmin = true, IsBlocked = false
            };
            var result = await users.CreateAsync(admin, password);
            if (!result.Succeeded)
                throw new InvalidOperationException("Unable to create the default administrator: " + string.Join(" ", result.Errors.Select(e => e.Description)));
            logger.LogInformation("Created default administrator account {Email}.", email);
            if (generated)
                logger.LogWarning("Generated administrator password (store it securely; it will not be shown again): {Password}", password);
        }
        else if (!admin.IsAdmin)
        {
            admin.IsAdmin = true;
            await users.UpdateAsync(admin);
            logger.LogInformation("Promoted configured administrator account {Email}.", email);
        }

        if (!await db.AppearanceProfiles.AnyAsync(profile => profile.UserId == admin.Id))
        {
            db.AppearanceProfiles.Add(new AppearanceProfile
            {
                UserId = admin.Id,
                LightTheme = DefaultThemes.Light,
                DarkTheme = DefaultThemes.Dark,
                UpdatedAt = DateTimeOffset.UtcNow
            });
            await db.SaveChangesAsync();
        }

        if (!await db.SystemSettings.AnyAsync())
        {
            db.SystemSettings.Add(new SystemSettings { Id = 1, RegistrationEnabled = true });
            await db.SaveChangesAsync();
        }
    }

    private static string GeneratePassword()
    {
        var bytes = RandomNumberGenerator.GetBytes(30);
        return Convert.ToBase64String(bytes) + "!A1";
    }
}
