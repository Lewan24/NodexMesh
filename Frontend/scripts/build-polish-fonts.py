"""Add Polish composites using only each font's own letter and accent outlines.

Requires fonttools. Sources are unmodified upstream TTFs in src/assets/fonts.
Outputs are renamed derived WOFF fonts; licenses are in public/font-licenses.
No glyphs are copied from a different typeface.
"""
from pathlib import Path
import unicodedata

from fontTools.agl import UV2AGL
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parents[1] / 'src/assets/fonts'
POLISH = '\u0104\u0106\u0118\u0141\u0143\u00d3\u015a\u0179\u017b\u0105\u0107\u0119\u0142\u0144\u00f3\u015b\u017a\u017c'

for source, family in [('ShortStack', 'Nodex Stack'), ('Schoolbell', 'Nodex Schoolbell'), ('WalterTurncoat', 'Nodex Turncoat')]:
    font = TTFont(ROOT / f'{source}-Regular.ttf')
    cmap = font.getBestCmap()
    glyf = font['glyf']
    for character in POLISH:
        point = ord(character)
        if point in cmap:
            continue
        base, accent = unicodedata.normalize('NFD', character)
        base_name = cmap[ord(base)]
        accent_name = {'\u0301': 'acute', '\u0307': 'dotaccent', '\u0328': 'ogonek'}[accent]
        if base.isupper():
            accent_name = next((name for name in [accent_name + '.cap', accent_name + 'cmb.cap', accent_name] if name in glyf), accent_name)
        letter, mark = glyf[base_name], glyf[accent_name]
        letter.recalcBounds(glyf)
        mark.recalcBounds(glyf)
        if accent == '\u0328':
            dx = letter.xMax - mark.xMax
            dy = -mark.yMax
        else:
            dx = round((letter.xMin + letter.xMax - mark.xMin - mark.xMax) / 2)
            dy = letter.yMax + round(font['head'].unitsPerEm * 0.035) - mark.yMin
        pen = TTGlyphPen(font.getGlyphSet())
        pen.addComponent(base_name, (1, 0, 0, 1, 0, 0))
        pen.addComponent(accent_name, (1, 0, 0, 1, dx, dy))
        name = UV2AGL.get(point, f'uni{point:04X}')
        glyph = pen.glyph()
        glyf[name] = glyph
        glyph.recalcBounds(glyf)
        font['hmtx'][name] = font['hmtx'][base_name]
        for table in font['cmap'].tables:
            if table.isUnicode():
                table.cmap[point] = name
        cmap[point] = name
    # Respect reserved font names and make the modification identifiable.
    for record in font['name'].names:
        if record.nameID in (1, 3, 4, 6, 16):
            value = family.replace(' ', '') + '-Regular' if record.nameID == 6 else family
            record.string = value.encode(record.getEncoding())
    font['head'].yMax = max(font['head'].yMax, max(glyph.yMax for glyph in glyf.glyphs.values() if hasattr(glyph, 'yMax')))
    font['hhea'].ascent = max(font['hhea'].ascent, font['head'].yMax)
    font.flavor = 'woff'
    font.save(ROOT / f'{family.replace(" ", "")}-Regular.woff')
