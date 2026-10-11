"""iPad App Store screenshots, illustrated set (13", 2064x2752).

The iPad twin of build-ios-illustrated-screenshots.py, and it works from the
same six illustrations in store-assets/source/illustrated.

It does not use store-assets/source/finished. Those panels are composed at the
phone's 1:2.16 with their headlines baked in; an iPad is 1:1.33, so fitting one
would crop its own headline off. The headline is drawn here instead, which is
why panels 1, 2 and 5 will not match the phone set exactly.

    python3 scripts/build-ipad-illustrated-screenshots.py
"""

from pathlib import Path

from PIL import Image

import store_screenshot_design as d

ROOT = Path(__file__).resolve().parents[1]
ART_DIR = ROOT / "store-assets" / "source" / "illustrated"
OUTPUT_DIR = ROOT / "store-assets" / "ios" / "ipad-13-illustrated"

WIDTH, HEIGHT = 2064, 2752
# A tablet is held further away than a phone, so the type is not simply scaled
# by the width - it sits a little smaller against the picture than it does on
# the phone, which is how it reads at arm's length.
HEAD_TOP, HEAD_SIZE, HEAD_GAP = 250, 168, 22
SCRIM_HEIGHT, SCRIM_STRENGTH = 1180, 210

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
        d.draw_badge(canvas, "First story free", (WIDTH // 2, HEIGHT - 430), 74, -4)
        d.draw_brand(canvas, HEIGHT - 280, 150, 78)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
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
