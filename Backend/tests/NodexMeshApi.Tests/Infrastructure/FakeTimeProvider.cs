namespace NodexMeshApi.Tests.Infrastructure;

/// <summary>
/// A <see cref="TimeProvider"/> whose clock only moves when the test tells it to — lets
/// expiry/idempotency-window logic (e.g. <c>ShareLinkService</c>'s access-count throttling)
/// be tested deterministically instead of racing real wall-clock time.
/// </summary>
public sealed class FakeTimeProvider : TimeProvider
{
    private DateTimeOffset _now;

    public FakeTimeProvider(DateTimeOffset? start = null) =>
        _now = start ?? new DateTimeOffset(2026, 1, 1, 0, 0, 0, TimeSpan.Zero);

    public override DateTimeOffset GetUtcNow() => _now;

    public void Advance(TimeSpan by) => _now = _now.Add(by);

    public void SetTo(DateTimeOffset value) => _now = value;
}
