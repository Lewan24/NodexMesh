using System.Net.Mime;
using FluentAssertions;
using NodexMeshApi.Services;
using Xunit;

namespace NodexMeshApi.Tests.Unit;

public sealed class EmailServiceTests
{
    [Fact]
    public void SmtpMessage_UsesUtf8MultipartAlternative_WithHtmlAsThePreferredLastPart()
    {
        var settings = new EffectiveEmailSettings(
            true, true, "database", "smtp.test", 587, true, "", "",
            "sender@nodexmesh.test", "NodexMesh", "https://nodexmesh.test", true, true);
        var envelope = new EmailEnvelope(
            "recipient@nodexmesh.test", "HTML test", "Plain fallback", "<h1>Rendered card</h1>");

        using var message = SmtpEmailTransport.CreateMessage(settings, envelope);

        message.IsBodyHtml.Should().BeFalse();
        message.Body.Should().Be("Plain fallback");
        message.AlternateViews.Should().HaveCount(2);
        message.AlternateViews[0].ContentType.MediaType.Should().Be(MediaTypeNames.Text.Plain);
        message.AlternateViews[1].ContentType.MediaType.Should().Be(MediaTypeNames.Text.Html);
        message.AlternateViews[1].ContentType.CharSet.Should().Be("utf-8");
    }
}
