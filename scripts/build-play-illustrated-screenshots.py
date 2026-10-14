"""Play Store screenshots, illustrated set (phone, 1080x1920).

The Android twin of build-ios-illustrated-screenshots.py, from the same six
illustrations in store-assets/source/illustrated.

Play will not take the iPhone set. A phone screenshot there has to sit between
2:1 and 1:2, and the iPhone panels are 1206x2622 - 1:2.17 - so they are refused
on upload. 1080x1920 is 1:1.78, which is what the existing Play assets use.

It does not use store-assets/source/finished either: those are composed at the
phone's 1:2.16 with their headlines baked in, and fitting one into 1:1.78 would
crop its own headline off. The headline is drawn here instead.

    python3 scripts/build-play-illustrated-screenshots.py
"""

from pathlib import Path

from PIL import Image

import store_screenshot_design as d

ROOT = Path(__file__).resolve().parents[1]
ART_DIR = ROOT / "store-assets" / "source" / "illustrated"
OUTPUT_DIR = ROOT / "store-assets" / "android" / "illustrated-screenshots"

WIDTH, HEIGHT = 1080, 1920
# Laid out against the iPhone set's 1284 and scaled, so the two look like one
# family. The shorter frame needs the headline a little further up.
BASE_WIDTH = 1284
SCALE = WIDTH / BASE_WIDTH
HEAD_TOP, HEAD_SIZE, HEAD_GAP = round(150 * SCALE), round(122 * SCALE), round(14 * SCALE)
SCRIM_HEIGHT, SCRIM_STRENGTH = round(820 * SCALE), 215

SCREENS = [
    ("01-read-together.png", "01-read-together.png", "gold",
     [("Read it", False), ("together…", True)], "brand"),
    ("02-let-them-listen.png", "02-let-them-listen.png", "sky",
     [("…or let", False), ("them listen", True)], None),
    ("03-theyre-the-star.png", "03-theyre-the-star.png", "pink",
     [("They’re", False), ("the star…", True)], None),
    ("04-anything-they-love.png", "04-anything-they-love.png", "mint",
     [("…in anything", False), ("they love", True)], None),
    ("05-every-night.png", "05-new-story-every-night.png", "lilac",
     [("A new story", False), ("every night", True)], None),
    ("06-drift-off.png", "06-until-they-drift-off.png", "peach",
     [("…until", False), ("they drift off", True)], None),
]


def scrim(canvas, height, strength):
    band = Image.new("RGBA", (1, height))
    pixels = band.load()
    for y in range(height):
        fade = 1 - (y / height) ** 1.5
        pixels[0, y] = (6, 8, 34, int(strength * fade))
    canvas.alpha_composite(band.resize((canvas.width, height), Image.Resampling.BILINEAR))


def build(output, art_name, accent_name, lines, extras):
    accent = d.ACCENTS[accent_name]
    art = Image.open(ART_DIR / art_name).convert("RGBA")
    canvas = d.cover(art, (WIDTH, HEIGHT)).convert("RGBA")

    scrim(canvas, SCRIM_HEIGHT, SCRIM_STRENGTH)
    d.draw_headline(canvas, HEAD_TOP, lines, accent, HEAD_SIZE, HEAD_GAP)

    if extras == "brand":
        d.draw_badge(canvas, "First story free", (WIDTH // 2, HEIGHT - round(300 * SCALE)), round(54 * SCALE), -4)
        d.draw_brand(canvas, HEIGHT - round(190 * SCALE), round(112 * SCALE), round(58 * SCALE))

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    # Play takes PNG or JPEG with no alpha.
    canvas.convert("RGB").save(OUTPUT_DIR / output, "PNG", optimize=True)
    print(f"  {output}")


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    wanted = {screen[0] for screen in SCREENS}
    for stale in OUTPUT_DIR.glob("*.png"):
        if stale.name not in wanted:
            stale.unlink()
    for screen in SCREENS:
        build(*screen)


if __name__ == "__main__":
    main()
