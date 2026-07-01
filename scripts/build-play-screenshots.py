from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "store-assets" / "android"
SOURCE_DIR = ASSETS / "screenshots"
OUTPUT_DIR = ASSETS / "promotional-screenshots"
BACKGROUND = OUTPUT_DIR / "dreamscapes-promo-background.png"
ICON = ASSETS / "play-store-icon-512.png"

WIDTH = 1080
HEIGHT = 1920
FONT_BOLD = "/System/Library/Fonts/Supplemental/Arial Rounded Bold.ttf"
FONT_REGULAR = "/System/Library/Fonts/Avenir Next.ttc"

SCREENS = [
    (
        "01-personalised-stories.jpg",
        "01-home.png",
        "Stories made\njust for them",
        "Personalised adventures for bedtime or anytime",
    ),
    (
        "02-story-builder.jpg",
        "02-story-builder.png",
        "You choose.\nDreamScapes creates.",
        "Pick the mood, duration, profiles and gentle lesson",
    ),
    (
        "03-plans-and-audio.jpg",
        "03-plans.png",
        "More stories.\nMore ways to listen.",
        "Flexible plans with saved stories and premium narration",
    ),
    (
        "04-parent-account.jpg",
        "04-parent-account.png",
        "One account.\nEvery story safe.",
        "Keep stories, audio and child profiles across devices",
    ),
]


def font(path, size, index=0):
    return ImageFont.truetype(path, size=size, index=index)


def cover(image, size):
    target_width, target_height = size
    scale = max(target_width / image.width, target_height / image.height)
    resized = image.resize(
        (round(image.width * scale), round(image.height * scale)),
        Image.Resampling.LANCZOS,
    )
    left = (resized.width - target_width) // 2
    top = (resized.height - target_height) // 2
    return resized.crop((left, top, left + target_width, top + target_height))


def rounded_image(image, size, radius):
    fitted = cover(image, size)
    mask = Image.new("L", size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size[0], size[1]), radius=radius, fill=255)
    fitted.putalpha(mask)
    return fitted


def build(output_name, source_name, headline, subhead):
    backdrop = cover(Image.open(BACKGROUND).convert("RGB"), (WIDTH, HEIGHT)).convert("RGBA")
    wash = Image.new("RGBA", (WIDTH, HEIGHT), (2, 7, 42, 38))
    backdrop = Image.alpha_composite(backdrop, wash)
    draw = ImageDraw.Draw(backdrop)

    icon = Image.open(ICON).convert("RGBA").resize((72, 72), Image.Resampling.LANCZOS)
    icon_mask = Image.new("L", icon.size, 0)
    ImageDraw.Draw(icon_mask).rounded_rectangle((0, 0, 72, 72), radius=16, fill=255)
    icon.putalpha(icon_mask)
    backdrop.alpha_composite(icon, (74, 60))

    brand_font = font(FONT_BOLD, 29)
    headline_font = font(FONT_BOLD, 72)
    subhead_font = font(FONT_REGULAR, 29)
    draw.text((164, 79), "DREAMSCAPES", font=brand_font, fill=(255, 221, 121, 255))
    draw.multiline_text(
        (74, 164),
        headline,
        font=headline_font,
        fill=(255, 255, 255, 255),
        spacing=4,
    )
    draw.text((76, 348), subhead, font=subhead_font, fill=(226, 221, 255, 255))

    frame_size = (880, 1408)
    frame_position = (100, 438)
    frame_radius = 38
    shadow = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    sx, sy = frame_position
    shadow_draw.rounded_rectangle(
        (sx + 4, sy + 18, sx + frame_size[0] + 4, sy + frame_size[1] + 18),
        radius=frame_radius,
        fill=(0, 0, 0, 185),
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(24))
    backdrop = Image.alpha_composite(backdrop, shadow)
    draw = ImageDraw.Draw(backdrop)
    draw.rounded_rectangle(
        (sx - 5, sy - 5, sx + frame_size[0] + 5, sy + frame_size[1] + 5),
        radius=frame_radius + 5,
        fill=(255, 221, 121, 255),
    )

    app_screen = rounded_image(Image.open(SOURCE_DIR / source_name).convert("RGBA"), frame_size, frame_radius)
    backdrop.alpha_composite(app_screen, frame_position)
    backdrop.convert("RGB").save(OUTPUT_DIR / output_name, "JPEG", quality=94, optimize=True)


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    for screen in SCREENS:
        build(*screen)


if __name__ == "__main__":
    main()
