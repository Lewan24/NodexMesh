namespace NodexMeshApi.Common;

public static class ApiTransportExtensions
{
    public static IServiceCollection AddApiCors(this IServiceCollection services, string[] allowedOrigins)
    {
        return services.AddCors(options => options.AddPolicy("Default", policy =>
        {
            if (allowedOrigins.Length > 0)
            {
                policy.WithOrigins(allowedOrigins)
                      .AllowAnyHeader()
                      .WithMethods("GET", "POST", "PUT", "PATCH", "DELETE")
                      .WithExposedHeaders("Retry-After")
                      .AllowCredentials();
            }
        }));
    }

    public static WebApplication UseApiTransportSecurity(this WebApplication app)
    {
        // Vite proxies same-origin /api requests to Kestrel's HTTP listener locally.
        // Redirecting that hop exposes the backend HTTPS origin to the browser and
        // fails fetch requests configured with redirect: 'error'.
        if (!app.Environment.IsDevelopment())
        {
            app.UseHsts();
            app.UseHttpsRedirection();
        }

        return app;
    }
}
