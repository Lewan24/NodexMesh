# Local fonts

Comic Neue full WOFF2 files come from https://github.com/crozynski/comicneue/tree/ef5be72411141d01f0b865df8edb47e552c11c3c/Fonts/WebFonts (SIL OFL, see public/font-licenses/comic-neue-full.txt). These replace the Fontsource Latin-only subset.

The unmodified ShortStack, Schoolbell and WalterTurncoat TTF sources come from https://github.com/google/fonts (`ofl/shortstack`, `apache/schoolbell`, `apache/walterturncoat`). Their licenses are retained in public/font-licenses.

Run `python scripts/build-polish-fonts.py` with fonttools to rebuild Nodex Stack, Nodex Schoolbell and Nodex Turncoat. The derived fonts compose missing Polish letters from the original base letter and its own acute, dot or ogonek. They retain original outlines and metrics, with expanded ascent for capitals. Derived internal names respect the Short Stack reserved font name. No other typeface supplies Polish glyphs.

Source file SHA-256:

- `ComicNeue-Bold.woff2`: `6574953451e62da266e30a071b56393eacb6865a4a3c26ba2a73b1c3a37cf79e`
- `ComicNeue-BoldItalic.woff2`: `b24900d4debe9a84621dac335edaf7a87144e00c04cedb83602f654b01daa0c5`
- `ComicNeue-Italic.woff2`: `09ab514b68ef3ddb55e03a7ec5a6b100caea5b36195a6d3f104250e3279efc65`
- `ComicNeue-Regular.woff2`: `dc603c8b97ea803cc1377f15a8cd952ca2fb7408e322b8025099ad1cbf6eaf4f`
- `Schoolbell-Regular.ttf`: `00ff6655a5eb1eb70d32f2b7351d1bcf3f45f3f9ca40fd5c0d25da79f7f82a50`
- `ShortStack-Regular.ttf`: `9f0e16e8683b2dce66edd7c3340362b554326739fbac594cabc1e9442cf5e8cc`
- `WalterTurncoat-Regular.ttf`: `ab7e9ca31710733211c5a938d2c851c84c0d21f6af4486f32bc6d374281b2da0`
