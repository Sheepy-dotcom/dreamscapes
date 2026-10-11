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
# A panel finished elsewhere, headline and all. Anything in here wins over
# compositing, so a hand-made screenshot is not quietly rebuilt over the next
# time this runs - it is only resized to the size the store asks for.
FINISHED_DIR = ROOT / "store-assets" / "source" / "finished"
UI_DIR = ROOT / "store-assets" / "source" / "ui"
OUTPUT_DIR = ROOT / "store-assets" / "ios" / "screenshots-illustrated"
OUT_DIR = OUTPUT_DIR

# App Store Connect takes a different size per display class, and offers only
# the slot it wants. The set was first built at 1284x2778 - the old 6.5" size -
# and every file came back "File dimensions are invalid", then 1320x2868 was
# wrong again for the 6.1"/6.3" slot. So every accepted portrait size is built,
# into a folder named after it, and the right one is to hand whichever slot the
# upload page offers.
#
# The design is laid out against 1284 wide and scaled, because these shapes are
# all within about one per cent of each other.
BASE_WIDTH = 1284
SIZES = [
    (1320, 2868, "6.9-inch"),
    (1206, 2622, "6.3-inch"),
    (1179, 2556, "6.1-inch"),
]

WIDTH = HEIGHT = SCALE = None
HEAD_TOP = HEAD_SIZE = HEAD_GAP = BEZEL = RADIUS = None


def use_size(width, height):
    """Lay the design out for one of the sizes above."""
    global WIDTH, HEIGHT, SCALE, HEAD_TOP, HEAD_SIZE, HEAD_GAP, BEZEL, RADIUS
    WIDTH, HEIGHT = width, height
    SCALE = WIDTH / BASE_WIDTH
    HEAD_TOP, HEAD_SIZE, HEAD_GAP = round(196 * SCALE), round(122 * SCALE), round(14 * SCALE)
    BEZEL, RADIUS = round(20 * SCALE), round(78 * SCALE)


use_size(*SIZES[0][:2])

# (output, artwork, accent, headline lines, phone or None, extras)
# A phone is (ui capture, screen width, x offset from centre, top y, tilt,
# crop_bottom), all given at BASE_WIDTH and scaled to whichever size is being
# built.
# The phones sit low and are cropped rather than shrunk: the artwork's faces
# are the reason anyone looks at these, and a phone over a face is the one
# thing that makes a store panel feel like a mock-up instead of a bedtime.
SCREENS = [
    ("01-read-together.png", "01-read-together.png", "gold",
     [("Read it", False), ("together…", True)], None, "brand"),
    ("02-let-them-listen.png", "02-let-them-listen.png", "sky",
     [("…or let", False), ("them listen", True)],
     ("ui-player.png", 560, 250, 1760, -4, 580), None),
    ("03-theyre-the-star.png", "03-theyre-the-star.png", "pink",
     [("They’re", False), ("the star…", True)], None, None),
    ("04-anything-they-love.png", "04-anything-they-love.png", "mint",
     [("…in anything", False), ("they love", True)], None, None),
    ("05-every-night.png", "05-new-story-every-night.png", "lilac",
     [("A new story", False), ("every night", True)],
     ("ui-library.png", 530, 110, 1700, 0, 520), None),
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
    finished = FINISHED_DIR / output
    if finished.exists():
        art = Image.open(finished).convert("RGB")
        d.cover(art, (WIDTH, HEIGHT)).save(OUT_DIR / output, "PNG", optimize=True)
        print(f"  {output}  (finished panel, {art.width}x{art.height} -> {WIDTH}x{HEIGHT})")
        return

    accent = d.ACCENTS[accent_name]
    art = Image.open(ART_DIR / art_name).convert("RGBA")
    canvas = d.cover(art, (WIDTH, HEIGHT)).convert("RGBA")

    scrim(canvas, round(1080 * SCALE), 215)
    d.draw_headline(canvas, HEAD_TOP, lines, accent, HEAD_SIZE, HEAD_GAP)

    if phone:
        ui_name, screen_w, dx, top_y, tilt, crop_bottom = phone
        screen_w, crop_bottom = round(screen_w * SCALE), round(crop_bottom * SCALE)
        centre_x, top_y = WIDTH // 2 + round(dx * SCALE), round(top_y * SCALE)
        source = Image.open(UI_DIR / ui_name).convert("RGBA")
        frame, _ = d.device(source, screen_w, BEZEL, RADIUS, crop_bottom=crop_bottom)
        shadow, pad = d.soft_shadow(frame.size, RADIUS, blur=round(52 * SCALE), alpha=215)
        if tilt:
            frame = frame.rotate(tilt, resample=Image.Resampling.BICUBIC, expand=True)
            shadow = shadow.rotate(tilt, resample=Image.Resampling.BICUBIC, expand=True)
        canvas.alpha_composite(shadow, (centre_x - shadow.width // 2, top_y - pad + round(26 * SCALE)))
        canvas.alpha_composite(frame, (centre_x - frame.width // 2, top_y))

    if extras == "brand":
        d.draw_badge(canvas, "First story free", (WIDTH // 2, HEIGHT - round(360 * SCALE)), round(54 * SCALE), -4)
        d.draw_brand(canvas, HEIGHT - round(230 * SCALE), round(112 * SCALE), round(58 * SCALE))

    canvas.convert("RGB").save(OUT_DIR / output, "PNG", optimize=True)
    print(f"  {output}  (composited)")


def main():
    global OUT_DIR
    wanted = {screen[0] for screen in SCREENS}
    for width, height, label in SIZES:
        use_size(width, height)
        OUT_DIR = OUTPUT_DIR / f"{label}-{width}x{height}"
        OUT_DIR.mkdir(parents=True, exist_ok=True)
        for stale in OUT_DIR.glob("*.png"):
            if stale.name not in wanted:
                stale.unlink()
        print(f"{label}  {width}x{height}")
        for screen in SCREENS:
            build(*screen)


if __name__ == "__main__":
    main()
