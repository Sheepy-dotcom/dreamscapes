from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
ANDROID_ASSETS = ROOT / "store-assets" / "android"
SOURCE_DIR = ANDROID_ASSETS / "screenshots"
OUTPUT_DIR = ROOT / "store-assets" / "ios" / "ipad-13-screenshots"
BACKGROUND = ANDROID_ASSETS / "promotional-screenshots" / "dreamscapes-promo-background.png"
ICON = ANDROID_ASSETS / "play-store-icon-512.png"

WIDTH = 2064
HEIGHT = 2752
TABLET_W = 1660
TABLET_H = 1820
TABLET_X = (WIDTH - TABLET_W) // 2
TABLET_Y = 860

FONT_BOLD = "/System/Library/Fonts/Supplemental/Arial Rounded Bold.ttf"
FONT_REGULAR = "/System/Library/Fonts/Avenir Next.ttc"

SCREENS = [
    (
        "01-personalised-bedtime-stories.png",
        "01-home.png",
        "Personalised bedtime\nstories for children",
        "Create warm, magical stories around your child's name, interests and imagination.",
        "Made for families",
    ),
    (
        "02-create-the-perfect-story.png",
        "02-story-builder.png",
        "Build tonight's story\nin a few taps",
        "Choose the duration, mood, voice, language and gentle lesson before the magic begins.",
        "Story builder",
    ),
    (
        "03-save-and-listen-again.png",
        "03-library.png",
        "Save favourites\nand play audio",
        "Keep bedtime stories in a calm library, ready to read or listen to again.",
        "Story library",
    ),
    (
        "04-parent-friendly-controls.png",
        "04-parent-account.png",
        "Simple controls\nfor parents",
        "Manage child profiles, plans, story limits and saved adventures in one place.",
        "Parent account",
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


def wrap_text(draw, text, text_font, max_width):
    lines = []
    for paragraph in text.splitlines():
        words = paragraph.split()
        line = ""
        for word in words:
            test = f"{line} {word}".strip()
            if draw.textbbox((0, 0), test, font=text_font)[2] <= max_width:
                line = test
            else:
                if line:
                    lines.append(line)
                line = word
        if line:
            lines.append(line)
    return "\n".join(lines)


def rounded_layer(size, radius, fill, outline=None, width=1):
    layer = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    inset = width // 2
    draw.rounded_rectangle(
        (inset, inset, size[0] - inset - 1, size[1] - inset - 1),
        radius=radius,
        fill=fill,
        outline=outline,
        width=width,
    )
    return layer


def library_source():
    canvas = Image.new("RGBA", (1400, 1860), (12, 16, 52, 255))
    draw = ImageDraw.Draw(canvas)
    header_font = font(FONT_BOLD, 58)
    eyebrow_font = font(FONT_BOLD, 24)
    title_font = font(FONT_BOLD, 42)
    body_font = font(FONT_REGULAR, 28)
    badge_font = font(FONT_BOLD, 22)
    button_font = font(FONT_BOLD, 24)
    tab_font = font(FONT_BOLD, 21)

    logo = Image.open(ICON).convert("RGBA").resize((86, 86), Image.Resampling.LANCZOS)
    logo_mask = Image.new("L", logo.size, 0)
    ImageDraw.Draw(logo_mask).rounded_rectangle((0, 0, 86, 86), radius=18, fill=255)
    logo.putalpha(logo_mask)
    canvas.alpha_composite(logo, (100, 86))
    draw.text((210, 100), "SAVED STORIES", font=eyebrow_font, fill=(255, 225, 132, 255))
    draw.text((210, 134), "Library", font=header_font, fill=(255, 255, 255, 255))

    tabs = [("All", True), ("Audio", False), ("Text", False), ("Saved", False), ("Series", False)]
    x = 100
    for label, active in tabs:
        width = 94 if label == "All" else 124
        fill = (255, 216, 132, 255) if active else (27, 31, 78, 255)
        outline = (255, 234, 163, 255) if active else (113, 94, 170, 120)
        text_fill = (25, 17, 58, 255) if active else (232, 226, 255, 235)
        draw.rounded_rectangle((x, 250, x + width, 310), radius=18, fill=fill, outline=outline, width=2)
        label_width = draw.textbbox((0, 0), label, font=tab_font)[2]
        draw.text((x + (width - label_width) // 2, 268), label, font=tab_font, fill=text_fill)
        x += width + 18

    draw.rounded_rectangle((1000, 250, 1280, 310), radius=18, fill=(27, 31, 78, 255), outline=(113, 94, 170, 120), width=2)
    draw.text((1034, 268), "Sort  Newest", font=tab_font, fill=(255, 250, 224, 255))

    def card(y, title, preview, saved=False):
        outline = (255, 226, 122, 255) if saved else (188, 167, 255, 100)
        draw.rounded_rectangle((100, y, 1300, y + 330), radius=24, fill=(9, 13, 45, 248), outline=outline, width=4)
        if saved:
            draw.rounded_rectangle((132, y + 30, 274, y + 78), radius=24, fill=(255, 226, 122, 255))
            draw.text((176, y + 43), "Saved", font=badge_font, fill=(24, 16, 58, 255))
        draw.text((132, y + 108), title, font=title_font, fill=(255, 250, 224, 255))
        draw.text((132, y + 168), preview, font=body_font, fill=(235, 230, 255, 230))
        draw.rounded_rectangle((132, y + 246, 600, y + 304), radius=16, fill=(255, 218, 132, 255))
        draw.text((306, y + 264), "Play Story", font=button_font, fill=(25, 18, 60, 255))
        draw.rounded_rectangle((632, y + 246, 880, y + 304), radius=16, fill=(68, 54, 123, 255))
        draw.text((726, y + 264), "Open", font=button_font, fill=(255, 250, 224, 255))

    card(420, "Rosie and the Moonlit Library", "A gentle adventure saved for tomorrow's bedtime.", saved=True)
    card(790, "The Star That Learned to Shine", "A magical story with audio ready to play.")
    card(1160, "The Brave Little Cloud", "A calming favourite for sleepy evenings.", saved=True)
    return canvas


def clean_builder_source():
    source = Image.open(SOURCE_DIR / "02-story-builder.png").convert("RGBA")
    draw = ImageDraw.Draw(source)

    field_fill = (7, 11, 40, 255)
    field_outline = (82, 65, 146, 210)
    panel_fill = (35, 28, 85, 245)

    # Match the current app: optional safety fields and story idea start empty.
    draw.rounded_rectangle((83, 1160, 535, 1212), radius=9, fill=field_fill, outline=field_outline, width=2)
    draw.rounded_rectangle((546, 1160, 998, 1212), radius=9, fill=field_fill, outline=field_outline, width=2)
    draw.rounded_rectangle((83, 1330, 998, 1380), radius=10, fill=panel_fill)
    draw.rounded_rectangle((83, 1382, 998, 1536), radius=9, fill=field_fill, outline=field_outline, width=2)

    return source


def source_screen(source_name):
    if source_name == "02-story-builder.png":
        return clean_builder_source()
    if source_name == "03-library.png":
        return library_source()
    return Image.open(SOURCE_DIR / source_name).convert("RGBA")


def tablet_mockup(source_name):
    tablet = Image.new("RGBA", (TABLET_W, TABLET_H), (0, 0, 0, 0))
    shadow = rounded_layer((TABLET_W, TABLET_H), 86, (0, 0, 0, 165))
    shadow = shadow.filter(ImageFilter.GaussianBlur(32))
    tablet.alpha_composite(shadow, (0, 24))

    frame = rounded_layer((TABLET_W, TABLET_H), 86, (247, 243, 255, 255))
    tablet.alpha_composite(frame, (0, 0))

    margin = 34
    screen_size = (TABLET_W - margin * 2, TABLET_H - margin * 2)
    screen = cover(source_screen(source_name), screen_size)
    mask = Image.new("L", screen_size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, *screen_size), radius=58, fill=255)
    screen.putalpha(mask)
    tablet.alpha_composite(screen, (margin, margin))

    draw = ImageDraw.Draw(tablet)
    draw.rounded_rectangle((TABLET_W // 2 - 100, 46, TABLET_W // 2 + 100, 76), radius=15, fill=(5, 7, 22, 220))
    return tablet


def build(output_name, source_name, headline, subhead, pill):
    backdrop = cover(Image.open(BACKGROUND).convert("RGB"), (WIDTH, HEIGHT)).convert("RGBA")
    backdrop = Image.alpha_composite(backdrop, Image.new("RGBA", (WIDTH, HEIGHT), (6, 9, 42, 55)))

    glow = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    glow_draw.ellipse((-420, 20, 920, 1180), fill=(157, 102, 255, 92))
    glow_draw.ellipse((1030, -280, 2360, 960), fill=(255, 207, 112, 70))
    glow_draw.ellipse((520, 1820, 1780, 3100), fill=(255, 164, 206, 54))
    backdrop = Image.alpha_composite(backdrop, glow.filter(ImageFilter.GaussianBlur(88)))

    draw = ImageDraw.Draw(backdrop)
    icon = Image.open(ICON).convert("RGBA").resize((118, 118), Image.Resampling.LANCZOS)
    icon_mask = Image.new("L", icon.size, 0)
    ImageDraw.Draw(icon_mask).rounded_rectangle((0, 0, 118, 118), radius=28, fill=255)
    icon.putalpha(icon_mask)
    backdrop.alpha_composite(icon, (142, 104))

    brand_font = font(FONT_BOLD, 44)
    pill_font = font(FONT_BOLD, 30)
    headline_font = font(FONT_BOLD, 108)
    subhead_font = font(FONT_REGULAR, 42)

    draw.text((292, 140), "DREAMSCAPES", font=brand_font, fill=(255, 226, 132, 255))
    pill_width = 44 + draw.textbbox((0, 0), pill, font=pill_font)[2]
    draw.rounded_rectangle((142, 276, 142 + pill_width, 350), radius=37, fill=(255, 226, 132, 238))
    draw.text((164, 299), pill, font=pill_font, fill=(28, 17, 66, 255))
    headline_position = (142, 404)
    draw.multiline_text(headline_position, headline, font=headline_font, fill=(255, 255, 255, 255), spacing=10)
    headline_box = draw.multiline_textbbox(headline_position, headline, font=headline_font, spacing=10)
    subhead_y = headline_box[3] + 36
    draw.multiline_text(
        (146, subhead_y),
        wrap_text(draw, subhead, subhead_font, WIDTH - 292),
        font=subhead_font,
        fill=(242, 236, 255, 245),
        spacing=10,
    )

    backdrop.alpha_composite(tablet_mockup(source_name), (TABLET_X, TABLET_Y))
    backdrop.convert("RGB").save(OUTPUT_DIR / output_name, "PNG", optimize=True)


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    for screen in SCREENS:
        build(*screen)


if __name__ == "__main__":
    main()
