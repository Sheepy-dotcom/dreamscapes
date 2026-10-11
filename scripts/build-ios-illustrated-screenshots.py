"""iPhone App Store screenshots, illustrated set (6.5", 1284x2778).

A different approach to build-ios-screenshots.py, which puts a real screen on
a gradient and points a callout at it. This set leads with the feeling instead:
a full-bleed bedtime illustration with a headline over it, and the app itself
shown on only two of the six panels.

The artwork is generated separately and lives in store-assets/source/illustrated.
The two UI captures come from a signed-in simulator, so the shelf has real
covers on it rather than placeholder art.

    python3 scripts/build-ios-illustrated-screenshots.py
"""

from pathlib import Path

from PIL import Image, ImageDraw

import store_screenshot_design as d

ROOT = Path(__file__).resolve().parents[1]
ART_DIR = ROOT / "store-assets" / "source" / "illustrated"
UI_DIR = ROOT / "store-assets" / "source" / "ui"
OUTPUT_DIR = ROOT / "store-assets" / "ios" / "screenshots-illustrated"

WIDTH, HEIGHT = 1284, 2778
HEAD_TOP, HEAD_SIZE, HEAD_GAP = 196, 122, 14
BEZEL, RADIUS = 20, 78

# (output, artwork, accent, headline lines, phone or None, extras)
# A phone is (ui capture, screen width, centre x, top y, tilt).
SCREENS = [
    ("01-read-together.png", "01-read-together.png", "gold",
     [("Read it", False), ("together…", True)], None, "brand"),
    ("02-let-them-listen.png", "02-let-them-listen.png", "sky",
     [("…or let", False), ("them listen", True)],
     ("ui-player.png", 560, WIDTH // 2 + 250, 1430, -4), None),
    ("03-theyre-the-star.png", "03-theyre-the-star.png", "pink",
     [("They’re", False), ("the star…", True)], None, None),
    ("04-anything-they-love.png", "04-anything-they-love.png", "mint",
     [("…in anything", False), ("they love", True)], None, None),
    ("05-every-night.png", "05-new-story-every-night.png", "lilac",
     [("A new story", False), ("every night", True)],
     ("ui-library.png", 580, WIDTH // 2, 1300, 0), None),
    ("06-drift-off.png", "06-until-they-drift-off.png", "peach",
     [("…until", False), ("they drift off", True)], None, None),
]


def scrim(canvas, height, strength):
    """Darkens the top of the artwork so white type stays readable on it.

    The illustrations are asked for a plain upper third, but "plain" still
    means lamplight and stars, and a headline has to survive whatever the
    model decides to put there.
    """
    band = Image.new("RGBA", (1, height))
    pixels = band.load()
    for y in range(height):
        fade = 1 - (y / height) ** 1.5
        pixels[0, y] = (6, 8, 34, int(strength * fade))
    canvas.alpha_composite(band.resize((canvas.width, height), Image.Resampling.BILINEAR))


def build(output, art_name, accent_name, lines, phone, extras):
    accent = d.ACCENTS[accent_name]
    art = Image.open(ART_DIR / art_name).convert("RGBA")
    canvas = d.cover(art, (WIDTH, HEIGHT)).convert("RGBA")

    scrim(canvas, 1080, 215)
    d.draw_headline(canvas, HEAD_TOP, lines, accent, HEAD_SIZE, HEAD_GAP)

    if phone:
        ui_name, screen_w, centre_x, top_y, tilt = phone
        source = Image.open(UI_DIR / ui_name).convert("RGBA")
        frame, _ = d.device(source, screen_w, BEZEL, RADIUS)
        shadow, pad = d.soft_shadow(frame.size, RADIUS, blur=52, alpha=215)
        if tilt:
            frame = frame.rotate(tilt, resample=Image.Resampling.BICUBIC, expand=True)
            shadow = shadow.rotate(tilt, resample=Image.Resampling.BICUBIC, expand=True)
        canvas.alpha_composite(shadow, (centre_x - shadow.width // 2, top_y - pad + 26))
        canvas.alpha_composite(frame, (centre_x - frame.width // 2, top_y))

    if extras == "brand":
        d.draw_badge(canvas, "First story free", (WIDTH // 2, HEIGHT - 360), 54, -4)
        d.draw_brand(canvas, HEIGHT - 230, 112, 58)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    canvas.convert("RGB").save(OUTPUT_DIR / output, "PNG", optimize=True)


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    wanted = {screen[0] for screen in SCREENS}
    for stale in OUTPUT_DIR.glob("*.png"):
        if stale.name not in wanted:
            stale.unlink()
    for screen in SCREENS:
        build(*screen)
        print(f"  {screen[0]}")


if __name__ == "__main__":
    main()
