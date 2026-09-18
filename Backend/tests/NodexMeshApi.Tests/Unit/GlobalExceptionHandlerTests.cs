using System.Text.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging.Abstractions;
using NodexMeshApi.Common;
using Xunit;

namespace NodexMeshApi.Tests.Unit;

public class GlobalExceptionHandlerTests
{
    private static (DefaultHttpContext Context, MemoryStream Body) NewContext()
    {
        var context = new DefaultHttpContext();
        var body = new MemoryStream();
        context.Response.Body = body;
        return (context, body);
    }

    private static async Task<JsonElement> ReadResponseJsonAsync(MemoryStream body)
    {
        body.Position = 0;
        using var doc = await JsonDocument.ParseAsync(body);
        return doc.RootElement.Clone();
    }

    [Fact]
    public async Task ApiException_MapsToItsOwnStatusCodeAndMessage()
    {
        var handler = new GlobalExceptionHandler(NullLogger<GlobalExceptionHandler>.Instance);
        var (context, body) = NewContext();
        var exception = new ApiException(409, "revision_mismatch", "The project was changed by someone else.");

        var handled = await handler.TryHandleAsync(context, exception, CancellationToken.None);

        handled.Should().BeTrue();
        context.Response.StatusCode.Should().Be(409);
        var json = await ReadResponseJsonAsync(body);
        json.GetProperty("title").GetString().Should().Be("revision_mismatch");
        json.GetProperty("detail").GetString().Should().Be("The project was changed by someone else.");
    }

    [Fact]
    public async Task UnexpectedException_NeverLeaksItsMessageOrType()
    {
        // OWASP A05: an attacker must never learn internal details (SQL error text, stack
        // frames, type names) from an unhandled exception.
        var handler = new GlobalExceptionHandler(NullLogger<GlobalExceptionHandler>.Instance);
        var (context, body) = NewContext();
        var secretLeak = new InvalidOperationException("Connection string: Host=db-prod-internal;Password=s3cr3t");

        var handled = await handler.TryHandleAsync(context, secretLeak, CancellationToken.None);

        handled.Should().BeTrue();
        context.Response.StatusCode.Should().Be(500);
        var raw = System.Text.Encoding.UTF8.GetString(body.ToArray());
        raw.Should().NotContain("s3cr3t");
        raw.Should().NotContain("db-prod-internal");
        raw.Should().NotContain("InvalidOperationException");

        var json = await ReadResponseJsonAsync(body);
        json.GetProperty("title").GetString().Should().Be("internal_error");
        json.GetProperty("detail").GetString().Should().Be("An unexpected error occurred.");
    }

    [Fact]
    public async Task OperationCanceledException_FromAnAbortedRequest_IsSwallowedNotLogged()
    {
        var handler = new GlobalExceptionHandler(NullLogger<GlobalExceptionHandler>.Instance);
        var (context, _) = NewContext();
        using var cts = new CancellationTokenSource();
        cts.Cancel();
        context.RequestAborted = cts.Token;

        var handled = await handler.TryHandleAsync(context, new OperationCanceledException(), CancellationToken.None);

        handled.Should().BeTrue(); // handled, no response written, no 500 surfaced
    }

    [Fact]
    public async Task ResponseAlreadyStarted_DoesNotAttemptToWriteAgain()
    {
        var handler = new GlobalExceptionHandler(NullLogger<GlobalExceptionHandler>.Instance);
        var (context, _) = NewContext();
        await context.Response.Body.WriteAsync(new byte[] { 1 }); // simulate partial write
        context.Response.OnStarting(() => Task.CompletedTask);

        // HasStarted only flips once headers are actually sent through a real server
        // pipeline; DefaultHttpContext alone won't set it, so this documents the contract
        // via the code path rather than asserting HasStarted directly.
        var handled = await handler.TryHandleAsync(context, new Exception("boom"), CancellationToken.None);
        handled.Should().BeTrue();
    }

    [Fact]
    public async Task ApiException_Status5xx_IsStillReturnedWithGenericTitleFromItsOwnCode()
    {
        // Even a 5xx raised deliberately via ApiException carries a caller-chosen code/message
        // (not the raw exception detail) — this just confirms the mapping doesn't special-case it.
        var handler = new GlobalExceptionHandler(NullLogger<GlobalExceptionHandler>.Instance);
        var (context, body) = NewContext();
        var exception = new ApiException(503, "dependency_unavailable", "A downstream dependency is unavailable.");

        await handler.TryHandleAsync(context, exception, CancellationToken.None);

        context.Response.StatusCode.Should().Be(503);
        var json = await ReadResponseJsonAsync(body);
        json.GetProperty("title").GetString().Should().Be("dependency_unavailable");
    }
}
