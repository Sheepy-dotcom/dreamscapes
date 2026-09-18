"""iPad App Store screenshots (13", 2064x2752).

Sources are captured at an iPad viewport (1032x1376 at 2x) so the set shows the
app as it actually lays out on a tablet - the library, for one, becomes a row of
cards - rather than a phone screen stretched into a tablet frame. The design is
shared with the iPhone set in store_screenshot_design.py.
"""

from pathlib import Path

from PIL import Image

import store_screenshot_design as d

ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "store-assets" / "ios" / "ipad-13-sources"
OUTPUT_DIR = ROOT / "store-assets" / "ios" / "ipad-13-screenshots"

WIDTH, HEIGHT = 2064, 2752
SCREEN_W, BEZEL, RADIUS = 1560, 40, 90
DEVICE_TOP = 880

# (output, source, accent, headline lines, subhead, callout region in source px,
#  zoom, tilt, downward nudge so the callout clears the heading above it, badge)
# Regions were measured from the live DOM at 1032x1376 and doubled for the 2x
# capture, so each frames a real piece of the app's UI.
SCREENS = [
    ("01-bedtime-story.png", "story.png", "gold",
     [("Never run out of", False), ("a bedtime story", True)],
     "Personalised stories, starring your child",
     (170, 1290, 1894, 1500), 1.15, -2, 0, "First story free  •  No account needed"),
    ("02-first-story-free.png", "home.png", "peach",
     [("Your first story", False), ("is free", True)],
     "No account needed, just tap and begin",
     (402, 1582, 1662, 1803), 1.35, 2, 0, None),
    ("03-made-in-a-minute.png", "builder.png", "pink",
     [("Made for tonight,", False), ("in about a minute", True)],
     "Just their name, their age and what they love",
     (110, 1465, 1938, 1711), 1.15, 2, 40, None),
    ("04-stories-continue.png", "library.png", "lilac",
     [("Stories continue", False), ("night after night", True)],
     "Seven-night journeys with the same characters",
     (106, 498, 718, 1228), 1.35, -3, 0, None),
    ("05-calm-narration.png", "narration.png", "sky",
     [("Calm narration", False), ("for lights-out", True)],
     "13 soothing voices with DreamScapes Plus",
     (120, 1300, 1928, 1690), 1.12, 2, 30, None),
    ("06-in-control.png", "controls.png", "mint",
     [("You are always", False), ("in control", True)],
     "Choose what to avoid, and read every story first",
     (110, 1465, 1938, 1711), 1.15, -2, 40, None),
]


def build(output, source_name, accent_name, lines, subhead, region, zoom, tilt, dy, badge):
    accent = d.ACCENTS[accent_name]
    source = Image.open(SOURCE_DIR / source_name).convert("RGBA")

    frame, scale = d.device(source, SCREEN_W, BEZEL, RADIUS)
    frame_x = (WIDTH - frame.width) // 2

    canvas = d.backdrop(
        WIDTH, HEIGHT, accent,
        (frame_x - 220, DEVICE_TOP + 200, frame_x + frame.width + 220, DEVICE_TOP + 1700),
    )
    d.draw_brand(canvas, 120, 104, 58)
    bottom = d.draw_headline(canvas, 320, lines, accent, 150, 24)
    d.draw_subhead(canvas, bottom + 56, subhead, 60, WIDTH - 360)

    shadow, pad = d.soft_shadow(frame.size, RADIUS, blur=60, alpha=200)
    canvas.alpha_composite(shadow, (frame_x - pad, DEVICE_TOP - pad + 40))
    canvas.alpha_composite(frame, (frame_x, DEVICE_TOP))

    screen_origin = (frame_x + BEZEL, DEVICE_TOP + BEZEL)
    d.draw_callout(canvas, source, region, scale, screen_origin, zoom, accent, tilt, radius=40, dy=dy)

    if badge:
        d.draw_badge(canvas, badge, (frame_x + frame.width - 380, DEVICE_TOP + 20), 54, 4)

    canvas.convert("RGB").save(OUTPUT_DIR / output, "PNG", optimize=True)


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    wanted = {screen[0] for screen in SCREENS}
    # Screenshots from an earlier layout would otherwise sit alongside the new
    # set and get uploaded by mistake.
    for stale in OUTPUT_DIR.glob("*.png"):
        if stale.name not in wanted:
            stale.unlink()
    for screen in SCREENS:
        build(*screen)
        print(f"  {screen[0]}")


if __name__ == "__main__":
    main()
