"""The card that appears when a DreamScapes link is pasted somewhere.

1200x630 is what Open Graph and Twitter want, and it is a wide shape - the
illustrations are all tall. Rather than crop a portrait picture to a letterbox
and lose most of it, the art sits on the right of the card and the logo and the
line sit on the left, which is the shape the message preview actually is.

    python3 scripts/build-link-preview.py
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

import store_screenshot_design as d

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / "store-assets" / "source" / "illustrated" / "01-read-together.png"
LOGO = ROOT / "assets" / "dreamscapes-logo.png"
OUTPUT = ROOT / "assets" / "link-preview.jpg"

WIDTH, HEIGHT = 1200, 630
# The art takes the right-hand slice; the words get the rest.
ART_LEFT = 560


def build():
    canvas = Image.new("RGBA", (WIDTH, HEIGHT), (16, 20, 60, 255))

    # The picture, cropped to the panel it occupies rather than to the whole
    # card - a 1200x630 crop of a 1024x1536 illustration is mostly duvet.
    art = Image.open(ART).convert("RGBA")
    panel = d.cover(art, (WIDTH - ART_LEFT, HEIGHT))
    canvas.alpha_composite(panel, (ART_LEFT, 0))

    # A gradient that hands the picture over to the background, so the words
    # never sit on a hard edge.
    fade_width = 260
    fade = Image.new("RGBA", (fade_width, 1))
    pixels = fade.load()
    for x in range(fade_width):
        pixels[x, 0] = (16, 20, 60, int(255 * (1 - x / fade_width) ** 1.1))
    canvas.alpha_composite(fade.resize((fade_width, HEIGHT), Image.Resampling.BILINEAR), (ART_LEFT, 0))

    # A little warmth behind the type, picked from the app's own night sky.
    # Blurred hard: an unblurred ellipse reads as a circle someone drew on the
    # card rather than as light.
    glow = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    ImageDraw.Draw(glow).ellipse((-300, -260, 660, 560), fill=(124, 142, 255, 52))
    canvas.alpha_composite(glow.filter(ImageFilter.GaussianBlur(120)))

    logo = Image.open(LOGO).convert("RGBA")
    logo_w = 400
    logo = logo.resize((logo_w, round(logo.height * logo_w / logo.width)), Image.Resampling.LANCZOS)
    canvas.alpha_composite(logo, (72, 96))

    draw = ImageDraw.Draw(canvas)
    head = d.font(d.FONT_BOLD, 54)
    sub = d.font(d.FONT_REGULAR, 30, d.FONT_REGULAR_INDEX)

    y = 96 + logo.height + 46
    for line, colour in [("A bedtime story", d.WHITE), ("made just for them", d.ACCENTS["gold"] + (255,))]:
        draw.text((72, y), line, font=head, fill=colour)
        y += 64

    y += 18
    for line in ["Their name, their favourite things, and a", "storyteller you choose. The first story is free."]:
        draw.text((72, y), line, font=sub, fill=(205, 213, 255, 255))
        y += 40

    # JPEG: a link preview is fetched by a crawler on someone else's network,
    # and 1200x630 of night sky is far smaller this way than as a PNG.
    canvas.convert("RGB").save(OUTPUT, "JPEG", quality=88, optimize=True, progressive=True)
    print(f"  {OUTPUT.relative_to(ROOT)}  {WIDTH}x{HEIGHT}  {OUTPUT.stat().st_size // 1024}KB")


if __name__ == "__main__":
    build()
