"""iPhone App Store screenshots (6.5", 1284x2778).

Run after capturing fresh sources into store-assets/android/screenshots. The
design lives in store_screenshot_design.py and is shared with the iPad set.
"""

from pathlib import Path

from PIL import Image

import store_screenshot_design as d

ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "store-assets" / "android" / "screenshots"
OUTPUT_DIR = ROOT / "store-assets" / "ios" / "screenshots"

WIDTH, HEIGHT = 1284, 2778
SCREEN_W, BEZEL, RADIUS = 1060, 24, 96
DEVICE_TOP = 820

# (output, source, accent, headline lines, subhead, callout region in source px,
#  zoom, tilt, downward nudge so the callout clears the heading above it, badge)
# Regions were measured from the live DOM at 540x960 and doubled for the 2x
# capture, so each one frames a real piece of the app's UI.
SCREENS = [
    ("01-personalised.png", "story.png", "gold",
     [("A bedtime story", False), ("written for them", True)],
     "Their name, their favourite things, their bedtime",
     (103, 838, 977, 1166), 1.2, -2, 0, "First story free  \u2022  No account needed"),
    ("02-first-story-free.png", "home.png", "peach",
     [("Your first story", False), ("is free", True)],
     "No account needed, just tap and begin",
     (76, 972, 1004, 1399), 1.1, 2, 0, None),
    ("03-made-in-a-minute.png", "builder1.png", "pink",
     [("Made for tonight,", False), ("in about a minute", True)],
     "Just their name, their age and what they love",
     (48, 1004, 1024, 1196), 1.2, 2, 45, None),
    ("04-stories-continue.png", "library.png", "lilac",
     [("Stories continue", False), ("night after night", True)],
     "Seven-night journeys with the same characters",
     (58, 522, 1022, 1195), 1.0, -2, 0, None),
    ("05-calm-narration.png", "narration.png", "sky",
     [("Calm narration", False), ("for lights-out", True)],
     "Seven soothing voices with DreamScapes Plus",
     (60, 850, 1012, 1160), 1.2, 2, 25, None),
    ("06-in-control.png", "controls.png", "mint",
     [("You are always", False), ("in control", True)],
     "Choose what to avoid, and read every story first",
     (48, 922, 1024, 1278), 1.2, -2, 60, None),
]


def build(output, source_name, accent_name, lines, subhead, region, zoom, tilt, dy, badge):
    accent = d.ACCENTS[accent_name]
    source = Image.open(SOURCE_DIR / source_name).convert("RGBA")

    frame, scale = d.device(source, SCREEN_W, BEZEL, RADIUS)
    frame_x = (WIDTH - frame.width) // 2

    canvas = d.backdrop(
        WIDTH, HEIGHT, accent,
        (frame_x - 160, DEVICE_TOP + 150, frame_x + frame.width + 160, DEVICE_TOP + 1500),
    )
    d.draw_brand(canvas, 96, 80, 44)
    bottom = d.draw_headline(canvas, 250, lines, accent, 118, 18)
    d.draw_subhead(canvas, bottom + 44, subhead, 46, WIDTH - 180)

    shadow, pad = d.soft_shadow(frame.size, RADIUS, blur=46, alpha=200)
    canvas.alpha_composite(shadow, (frame_x - pad, DEVICE_TOP - pad + 30))
    canvas.alpha_composite(frame, (frame_x, DEVICE_TOP))

    screen_origin = (frame_x + BEZEL, DEVICE_TOP + BEZEL)
    d.draw_callout(canvas, source, region, scale, screen_origin, zoom, accent, tilt, radius=34, dy=dy)

    if badge:
        d.draw_badge(canvas, badge, (frame_x + frame.width - 250, DEVICE_TOP + 20), 40, 5)

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
