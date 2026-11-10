using System.Data.Common;
using System.Net;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Connections.Features;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using NodexMeshApi.Auditing;
using NodexMeshApi.Data;
using NodexMeshApi.Tests.Infrastructure;
using Xunit;

namespace NodexMeshApi.Tests.Auditing;

public sealed class IpProtectionHubFilterTests : IDisposable
{
    private readonly SqliteInMemoryDb database = new();
    public void Dispose() => database.Dispose();
    public sealed class ProbeHub : Hub { public void Probe() { } }

    private static Mock<HubCallerContext> Caller(CancellationToken ct)
    {
        var http = new DefaultHttpContext();
        http.Connection.RemoteIpAddress = IPAddress.Parse("192.0.2.55");
        var feature = new Mock<IHttpContextFeature>();
        feature.SetupGet(value => value.HttpContext).Returns(http);
        var features = new FeatureCollection();
        features.Set(feature.Object);
        var caller = new Mock<HubCallerContext>();
        caller.SetupGet(value => value.Features).Returns(features);
        caller.SetupGet(value => value.ConnectionId).Returns("test-socket");
        caller.SetupGet(value => value.ConnectionAborted).Returns(ct);
        return caller;
    }

    private ServiceProvider Services(DbCommandInterceptor? interceptor = null)
    {
        using var context = database.CreateContext();
        var options = new DbContextOptionsBuilder<AppDbContext>().UseSqlite(context.Database.GetDbConnection())
            .UseSnakeCaseNamingConvention();
        if (interceptor is not null) options.AddInterceptors(interceptor);
        return new ServiceCollection().AddSingleton(options.Options).AddScoped<AppDbContext>()
            .AddOptions().AddScoped<IpProtectionService>().BuildServiceProvider();
    }

    private static HubInvocationContext Invocation(HubCallerContext caller, IServiceProvider services) =>
        new(caller, services, new ProbeHub(), typeof(ProbeHub).GetMethod(nameof(ProbeHub.Probe))!, []);

    [Fact]
    public async Task AlreadyClosedSocketsDoNotCreateScopesOrRunHubActions()
    {
        using var cancellation = new CancellationTokenSource();
        cancellation.Cancel();
        var caller = Caller(cancellation.Token);
        var scopes = new Mock<IServiceScopeFactory>(MockBehavior.Strict);
        var filter = new IpProtectionHubFilter(scopes.Object, new IpConnectionRegistry());
        var invoked = false;
        await filter.InvokeMethodAsync(Invocation(caller.Object, Mock.Of<IServiceProvider>()), _ =>
        { invoked = true; return ValueTask.FromResult<object?>(null); });
        await filter.OnConnectedAsync(new HubLifetimeContext(caller.Object, Mock.Of<IServiceProvider>(), new ProbeHub()), _ =>
        { invoked = true; return Task.CompletedTask; });
        invoked.Should().BeFalse();
        scopes.VerifyNoOtherCalls();
    }

    private sealed class CanceledQuery(CancellationTokenSource? source) : DbCommandInterceptor
    {
        public override ValueTask<InterceptionResult<DbDataReader>> ReaderExecutingAsync(DbCommand command,
            CommandEventData eventData, InterceptionResult<DbDataReader> result, CancellationToken cancellationToken = default)
        {
            source?.Cancel();
            throw new OperationCanceledException(cancellationToken);
        }
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task DisconnectDuringBanQueryDoesNotRunApplicationCodeOrSurfaceAsServerFailure(bool connecting)
    {
        using var cancellation = new CancellationTokenSource();
        using var services = Services(new CanceledQuery(cancellation));
        var caller = Caller(cancellation.Token);
        var registry = new IpConnectionRegistry();
        var filter = new IpProtectionHubFilter(services.GetRequiredService<IServiceScopeFactory>(), registry);
        var invoked = false;
        if (connecting)
            await filter.OnConnectedAsync(new HubLifetimeContext(caller.Object, services, new ProbeHub()), _ =>
            { invoked = true; return Task.CompletedTask; });
        else
            await filter.InvokeMethodAsync(Invocation(caller.Object, services), _ =>
            { invoked = true; return ValueTask.FromResult<object?>(null); });
        cancellation.IsCancellationRequested.Should().BeTrue();
        invoked.Should().BeFalse();
        registry.Ips.Should().BeEmpty();
    }

    [Fact]
    public async Task CancellationOfAnActiveConnectionIsNotSilenced()
    {
        using var services = Services(new CanceledQuery(null));
        var filter = new IpProtectionHubFilter(services.GetRequiredService<IServiceScopeFactory>(), new IpConnectionRegistry());
        var action = () => filter.InvokeMethodAsync(Invocation(Caller(default).Object, services), _ => ValueTask.FromResult<object?>(null)).AsTask();
        await action.Should().ThrowAsync<OperationCanceledException>();
    }

    [Fact]
    public async Task NewlyBannedConnectionsAreStillCheckedOnEveryInvocationAndCannotRunActions()
    {
        using var services = Services();
        var caller = Caller(default);
        var filter = new IpProtectionHubFilter(services.GetRequiredService<IServiceScopeFactory>(), new IpConnectionRegistry());
        await filter.InvokeMethodAsync(Invocation(caller.Object, services), _ => ValueTask.FromResult<object?>("allowed"));
        await using (var db = database.CreateContext())
        {
            db.IpAccessStates.Add(new IpAccessState { Ip = "192.0.2.55", BannedUntil = DateTime.UtcNow.AddHours(1) });
            await db.SaveChangesAsync();
        }
        var invoked = false;
        var action = () => filter.InvokeMethodAsync(Invocation(caller.Object, services), _ =>
        { invoked = true; return ValueTask.FromResult<object?>(null); }).AsTask();
        await action.Should().ThrowAsync<HubException>();
        caller.Verify(value => value.Abort(), Times.Once);
        invoked.Should().BeFalse();
    }
}
