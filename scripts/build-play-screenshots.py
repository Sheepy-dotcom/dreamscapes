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
        "Made just\nfor them",
        "Personalised adventures for bedtime or anytime",
        560,
    ),
    (
        "02-story-builder.jpg",
        "02-story-builder.png",
        "You choose.\nMagic begins.",
        "Pick the mood, duration, profiles and gentle lesson",
        0,
    ),
    (
        "03-story-library.jpg",
        "03-library.png",
        "Their stories.\nAlways ready.",
        "Save favourites and revisit every magical adventure",
        0,
    ),
    (
        "04-parent-account.jpg",
        "04-parent-account.png",
        "Safe, saved\nand in sync.",
        "Keep stories, audio and child profiles across devices",
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


def library_preview(image):
    image = image.copy()
    draw = ImageDraw.Draw(image)
    title_font = font(FONT_BOLD, 28)
    body_font = font(FONT_REGULAR, 17)
    meta_font = font(FONT_BOLD, 14)
    badge_font = font(FONT_BOLD, 14)
    button_font = font(FONT_BOLD, 16)

    draw.rectangle((82, 224, 999, image.height), fill=(17, 22, 67, 255))

    def story_card(y, title, preview, saved=False, new=False):
        outline = (255, 231, 133, 235) if saved or new else (216, 198, 255, 72)
        draw.rounded_rectangle(
            (83, y, 998, y + 278),
            radius=10,
            fill=(9, 14, 49, 242),
            outline=outline,
            width=2 if saved or new else 1,
        )
        text_y = y + 22
        if new:
            draw.rounded_rectangle((101, text_y, 211, text_y + 30), radius=15, fill=(255, 214, 132, 255))
            draw.text((118, text_y + 6), "New story", font=badge_font, fill=(22, 15, 53, 255))
        if saved:
            draw.rounded_rectangle((222, text_y, 302, text_y + 30), radius=15, fill=(75, 57, 128, 255))
            draw.text((239, text_y + 6), "Saved", font=badge_font, fill=(255, 248, 220, 255))
        if new or saved:
            text_y += 44
        draw.text((101, text_y), title, font=title_font, fill=(255, 248, 220, 255))
        draw.text((101, text_y + 43), "DreamScapes Plus  -  Story 05:12  -  Audio saved", font=meta_font, fill=(216, 198, 255, 220))
        draw.text((101, text_y + 74), preview, font=body_font, fill=(237, 232, 255, 225))
        button_y = y + 213
        draw.rounded_rectangle((101, button_y, 470, button_y + 48), radius=8, fill=(255, 215, 133, 255))
        draw.text((235, button_y + 13), "Open Story", font=button_font, fill=(27, 19, 61, 255))
        draw.rounded_rectangle((482, button_y, 646, button_y + 48), radius=8, fill=(63, 48, 111, 255))
        draw.text((536, button_y + 13), "Saved" if saved else "Save", font=button_font, fill=(255, 248, 220, 255))
        draw.rounded_rectangle((658, button_y, 820, button_y + 48), radius=8, fill=(34, 32, 78, 255))
        draw.text((711, button_y + 13), "Locked" if saved else "Delete", font=button_font, fill=(255, 231, 133, 255))

    story_card(
        226,
        "Rosie and the Moonlit Library",
        "Rosie followed a ribbon of starlight towards a secret library...",
        saved=True,
        new=True,
    )
    story_card(
        520,
        "The Star That Learned to Shine",
        "High above the sleepy rooftops, one little star needed a friend...",
    )
    return image


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
    if source_name == "03-library.png":
        source_screen = library_preview(source_screen)
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
