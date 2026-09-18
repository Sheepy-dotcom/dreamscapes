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
        "Never run out of\na bedtime story",
        "Your first story is free, no account needed",
        560,
    ),
    (
        "02-story-builder.jpg",
        "02-story-builder.png",
        "Made for tonight,\nin about a minute",
        "Their name, their age and what they love",
        0,
    ),
    (
        "03-story-library.jpg",
        "03-library.png",
        "Stories continue\nnight after night",
        "The same characters come back, night after night",
        0,
    ),
    (
        "04-parent-account.jpg",
        "04-parent-controls.png",
        "You are always\nin control",
        "Set topics to avoid and read every story first",
        620,
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


def crop_square(image, crop_y):
    side = min(image.width, image.height)
    crop_y = max(0, min(crop_y, image.height - side))
    crop_x = max(0, (image.width - side) // 2)
    return image.crop((crop_x, crop_y, crop_x + side, crop_y + side))


def rounded_image(image, size, radius, crop_y):
    fitted = crop_square(image, crop_y).resize(size, Image.Resampling.LANCZOS)
    mask = Image.new("L", size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size[0], size[1]), radius=radius, fill=255)
    fitted.putalpha(mask)
    return fitted


def build(output_name, source_name, headline, subhead, crop_y):
    backdrop = cover(Image.open(BACKGROUND).convert("RGB"), (WIDTH, HEIGHT)).convert("RGBA")
    wash = Image.new("RGBA", (WIDTH, HEIGHT), (2, 7, 42, 38))
    backdrop = Image.alpha_composite(backdrop, wash)

    frame_size = (900, 900)
    frame_position = (90, 750)
    frame_radius = 34
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

    icon = Image.open(ICON).convert("RGBA").resize((72, 72), Image.Resampling.LANCZOS)
    icon_mask = Image.new("L", icon.size, 0)
    ImageDraw.Draw(icon_mask).rounded_rectangle((0, 0, 72, 72), radius=16, fill=255)
    icon.putalpha(icon_mask)
    backdrop.alpha_composite(icon, (74, 60))

    brand_font = font(FONT_BOLD, 29)
    headline_font = font(FONT_BOLD, 96)
    subhead_font = font(FONT_REGULAR, 32)
    draw = ImageDraw.Draw(backdrop)
    draw.text((164, 79), "DREAMSCAPES", font=brand_font, fill=(255, 221, 121, 255))
    draw.multiline_text(
        (74, 162),
        headline,
        font=headline_font,
        fill=(255, 255, 255, 255),
        spacing=0,
    )
    draw.text((76, 394), subhead, font=subhead_font, fill=(238, 234, 255, 255))
    draw.rounded_rectangle(
        (sx - 5, sy - 5, sx + frame_size[0] + 5, sy + frame_size[1] + 5),
        radius=frame_radius + 5,
        fill=(255, 221, 121, 255),
    )

    source_screen = Image.open(SOURCE_DIR / source_name).convert("RGBA")
    app_screen = rounded_image(
        source_screen,
        frame_size,
        frame_radius,
        crop_y,
    )
    backdrop.alpha_composite(app_screen, frame_position)
    backdrop.convert("RGB").save(OUTPUT_DIR / output_name, "JPEG", quality=94, optimize=True)


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    for screen in SCREENS:
        build(*screen)


if __name__ == "__main__":
    main()
