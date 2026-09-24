using System.Text;
using System.Xml;
using System.Xml.Linq;
using Microsoft.Extensions.Options;
using NodexMeshApi.Common;

namespace NodexMeshApi.Services;

public sealed class LibraryOptions
{
    public string Path { get; set; } = "App_Data/library";
    public long MaxFileBytes { get; set; } = 50 * 1024 * 1024;
    public long MaxProjectBytes { get; set; } = 1024L * 1024 * 1024;
}

public sealed class LibraryStorage(IOptions<LibraryOptions> options, IWebHostEnvironment environment)
{
    public string Root { get; } = System.IO.Path.GetFullPath(options.Value.Path, environment.ContentRootPath);
    public string FilePath(Guid id) => System.IO.Path.Combine(Root, id.ToString("N"));

    public static string Validate(byte[] header, string extension, Stream stream)
    {
        var bytes = header.AsSpan();
        var type = extension.ToLowerInvariant() switch
        {
            ".png" when bytes.StartsWith(new byte[] { 137, 80, 78, 71, 13, 10, 26, 10 }) => "image/png",
            ".jpg" or ".jpeg" when bytes.StartsWith(new byte[] { 255, 216, 255 }) => "image/jpeg",
            ".gif" when bytes.StartsWith("GIF87a"u8) || bytes.StartsWith("GIF89a"u8) => "image/gif",
            ".webp" when bytes.StartsWith("RIFF"u8) && bytes[8..].StartsWith("WEBP"u8) => "image/webp",
            ".mp4" when bytes[4..].StartsWith("ftyp"u8) => "video/mp4",
            ".webm" when bytes.StartsWith(new byte[] { 26, 69, 223, 163 }) => "video/webm",
            ".svg" => ValidateSvg(stream),
            _ => null
        };
        return type ?? throw new ApiException(422, "invalid_media", "Unsupported file or file signature. Use PNG, JPEG, GIF, WebP, SVG, MP4 or WebM.");
    }

    private static string ValidateSvg(Stream stream)
    {
        if (stream.Length > 1_000_000) throw new ApiException(422, "invalid_svg", "SVG must be smaller than 1 MB.");
        stream.Position = 0;
        try
        {
            using var reader = XmlReader.Create(stream, new XmlReaderSettings
            {
                DtdProcessing = DtdProcessing.Prohibit, XmlResolver = null, MaxCharactersInDocument = 1_000_000
            });
            var document = XDocument.Load(reader);
            XNamespace ns = "http://www.w3.org/2000/svg";
            if (document.Root?.Name != ns + "svg") throw new XmlException();
            // A deliberately small, static SVG vocabulary: no scripts, embedded HTML,
            // animation, stylesheets, external resources, or event handlers.
            var elements = "svg g path rect circle ellipse line polyline polygon defs symbol use title desc linearGradient radialGradient stop clipPath mask".Split(' ').ToHashSet();
            var attributes = "id viewBox width height x y x1 y1 x2 y2 cx cy r rx ry d points fill stroke stroke-width stroke-linecap stroke-linejoin stroke-dasharray stroke-dashoffset fill-rule clip-rule opacity fill-opacity stroke-opacity transform gradientTransform gradientUnits offset stop-color stop-opacity clip-path mask preserveAspectRatio href".Split(' ').ToHashSet();
            foreach (var element in document.Root.DescendantsAndSelf())
            {
                if (element.Name.Namespace != ns || !elements.Contains(element.Name.LocalName)) throw new XmlException();
                foreach (var attribute in element.Attributes().Where(a => !a.IsNamespaceDeclaration))
                {
                    var value = attribute.Value.Trim();
                    if (!attributes.Contains(attribute.Name.LocalName) ||
                        (attribute.Name.Namespace != XNamespace.None && attribute.Name.NamespaceName != "http://www.w3.org/1999/xlink") ||
                        (attribute.Name.LocalName == "href" && !value.StartsWith('#')) ||
                        (value.Contains("url", StringComparison.OrdinalIgnoreCase) && !System.Text.RegularExpressions.Regex.IsMatch(value, @"^url\(#[a-zA-Z0-9_-]+\)$")))
                        throw new XmlException();
                }
            }
            if (document.DescendantNodes().OfType<XProcessingInstruction>().Any()) throw new XmlException();
            return "image/svg+xml";
        }
        catch (XmlException)
        {
            throw new ApiException(422, "invalid_svg", "Use a static SVG without scripts, styles, animation or external resources.");
        }
    }
}
