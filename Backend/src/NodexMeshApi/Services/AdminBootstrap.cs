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
            if (generated)
                throw new InvalidOperationException("Admin:Password must be supplied securely when creating the administrator account.");
            admin = new ApplicationUser
            {
                Id = Guid.CreateVersion7(), UserName = email, Email = email, DisplayName = "Administrator",
                IsAdmin = true, IsBlocked = false, EmailConfirmed = true
            };
            var result = await users.CreateAsync(admin, password);
            if (!result.Succeeded)
                throw new InvalidOperationException("Unable to create the default administrator: " + string.Join(" ", result.Errors.Select(e => e.Description)));
            logger.LogInformation("Created default administrator account {Email}.", email);
        }
        else if (!admin.IsAdmin || !admin.EmailConfirmed)
        {
            admin.IsAdmin = true;
            // The bootstrap address is controlled by the operator and must remain usable
            // when confirmation is enabled before the first interactive sign-in.
            admin.EmailConfirmed = true;
            await users.UpdateAsync(admin);
            logger.LogInformation("Promoted configured administrator account {Email}.", email);
        }

        if (!await db.AppearanceProfiles.AnyAsync(profile => profile.UserId == admin.Id))
        {
            db.AppearanceProfiles.Add(DefaultThemes.CreateProfile(admin.Id, DateTimeOffset.UtcNow));
            await db.SaveChangesAsync();
        }

        if (!await db.SystemSettings.AnyAsync())
        {
            db.SystemSettings.Add(new SystemSettings { Id = 1, RegistrationEnabled = true });
            await db.SaveChangesAsync();
        }

        var templateKeys = await db.EmailTemplates.Select(template => template.Key).ToHashSetAsync();
        var missingTemplates = EmailTemplateDefaults.All.Where(template => !templateKeys.Contains(template.Key)).ToList();
        if (missingTemplates.Count > 0)
        {
            db.EmailTemplates.AddRange(missingTemplates);
            await db.SaveChangesAsync();
            logger.LogInformation("Created {TemplateCount} default email templates.", missingTemplates.Count);
        }
    }

}
