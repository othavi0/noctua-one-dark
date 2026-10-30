#!/usr/bin/env -S uv run --script
# /// script
# dependencies = ["fonttools==4.55.3"]
# ///
"""Builds Geist Mono Noctua into mods/noctua-chrome/fonts/.
  scripts/build-font.py           download Geist Mono 1.9.0 and Unicode 16 emoji-data, then build
  scripts/build-font.py --check   list the symbols it would add, write nothing
Herdr draws a symbol its terminal font lacks with the color emoji font: Claude Code's
checked box [✔] comes out gray, two cells wide, over the "]". This adds every
text-default emoji symbol Geist Mono lacks (✔ ✖ ⚠ ☑ ⏸ …), one cell wide, from Noto Sans
Symbols 2 or Noto Sans Symbols, so the terminal draws them as text in its own color.
"""
import shutil
import sys
import urllib.request
from pathlib import Path

from fontTools.pens.transformPen import TransformPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont

REPO = Path(__file__).resolve().parent.parent
OUT = REPO / "mods/noctua-chrome/fonts"
CACHE = Path.home() / ".cache/noctua-build-font"
GEIST = "https://cdn.jsdelivr.net/npm/geist@1.9.0"
EMOJI_DATA = "https://www.unicode.org/Public/16.0.0/ucd/emoji/emoji-data.txt"
STYLES = ["Regular", "Bold", "Italic", "BoldItalic"]
SYMBOLS = ["/usr/share/fonts/noto/NotoSansSymbols2-Regular.ttf", "/usr/share/fonts/noto/NotoSansSymbols-Regular.ttf"]
FAMILY = "Geist Mono Noctua"


def fetch(url):
    path = CACHE / url.rsplit("/", 1)[1]
    if not path.exists():
        CACHE.mkdir(parents=True, exist_ok=True)
        urllib.request.urlretrieve(url, path)
    return path


def text_default_emoji(emoji_data):
    """Code points that are emoji but show as text unless asked (Emoji minus Emoji_Presentation)."""
    props = {"Emoji": set(), "Emoji_Presentation": set()}
    for line in emoji_data.read_text().splitlines():
        line = line.split("#", 1)[0].strip()
        if not line:
            continue
        cps, prop = (part.strip() for part in line.split(";"))
        if prop in props:
            lo, _, hi = cps.partition("..")
            props[prop].update(range(int(lo, 16), int(hi or lo, 16) + 1))
    # Below U+2000 are digits, #, *, © and ®, which Geist Mono has as letters; past U+2BFF
    # are pictographs (🌡, 🕊) that people write to get the emoji.
    return sorted(cp for cp in props["Emoji"] - props["Emoji_Presentation"] if 0x2000 <= cp <= 0x2BFF)


def add_symbols(font, wanted, sources):
    """Copies each wanted symbol from the first source that has it, scaled into one cell."""
    cmap = font.getBestCmap()
    advance = font["hmtx"]["a"][0]
    cap = font["OS/2"].sCapHeight
    glyf, hmtx = font["glyf"], font["hmtx"]
    added = []
    for cp in wanted:
        if cp in cmap:
            continue
        for src in sources:
            name = src.getBestCmap().get(cp)
            if not name:
                continue
            glyph = src["glyf"][name]
            glyph.recalcBounds(src["glyf"])
            if not glyph.numberOfContours and not glyph.isComposite():
                continue
            scale = min(advance * 0.9 / max(glyph.xMax - glyph.xMin, 1), cap * 1.15 / max(glyph.yMax - glyph.yMin, 1))
            dx = (advance - scale * (glyph.xMin + glyph.xMax)) / 2
            dy = cap / 2 - scale * (glyph.yMin + glyph.yMax) / 2
            pen = TTGlyphPen(None)
            src.getGlyphSet()[name].draw(TransformPen(pen, (scale, 0, 0, scale, dx, dy)))
            new = f"uni{cp:04X}.noctua"
            glyf[new] = pen.glyph()
            glyf[new].recalcBounds(glyf)
            hmtx[new] = (advance, glyf[new].xMin)
            for table in font["cmap"].tables:
                if table.isUnicode():
                    table.cmap[cp] = new
            added.append(cp)
            break
    # Setting a glyf entry already appended it to the font's glyph order.
    font.setGlyphOrder(glyf.glyphOrder)
    return added


def rename(font):
    for record in font["name"].names:
        text = record.toUnicode()
        if "Geist Mono" in text or "GeistMono" in text:
            record.string = text.replace("Geist Mono", FAMILY).replace("GeistMono", FAMILY.replace(" ", ""))


def main():
    check = "--check" in sys.argv[1:]
    wanted = text_default_emoji(fetch(EMOJI_DATA))
    sources = [TTFont(path) for path in SYMBOLS if Path(path).exists()]
    if not sources:
        sys.exit(f"build-font: none of {SYMBOLS} is installed")
    if not check:
        OUT.mkdir(parents=True, exist_ok=True)
        shutil.copy(fetch(f"{GEIST}/LICENSE.txt"), OUT / "OFL.txt")
    for style in STYLES:
        font = TTFont(fetch(f"{GEIST}/dist/fonts/geist-mono/GeistMono-{style}.ttf"), recalcTimestamp=False)
        added = add_symbols(font, wanted, sources)
        print(f"{style}: {len(added)} symbols added: {''.join(map(chr, added))}")
        if check:
            continue
        rename(font)
        font.save(OUT / f"GeistMonoNoctua-{style}.ttf")


if __name__ == "__main__":
    main()
