from pathlib import Path
import textwrap

from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
ANDROID_ASSETS = ROOT / "store-assets" / "android"
SOURCE_DIR = ANDROID_ASSETS / "screenshots"
OUTPUT_DIR = ROOT / "store-assets" / "ios" / "screenshots"
BACKGROUND = ANDROID_ASSETS / "promotional-screenshots" / "dreamscapes-promo-background.png"
ICON = ANDROID_ASSETS / "play-store-icon-512.png"

WIDTH = 1284
HEIGHT = 2778
PHONE_W = 1020
PHONE_H = 1813
PHONE_X = (WIDTH - PHONE_W) // 2
PHONE_Y = 770

FONT_BOLD = "/System/Library/Fonts/Supplemental/Arial Rounded Bold.ttf"
FONT_REGULAR = "/System/Library/Fonts/Avenir Next.ttc"

SCREENS = [
    (
        "01-personalised-bedtime-stories.png",
        "01-home.png",
        "Personalised stories\nmade in moments",
        "Create magical bedtime adventures with your child's name, mood and favourite ideas.",
        "Made for bedtime",
    ),
    (
        "02-create-the-perfect-story.png",
        "02-story-builder.png",
        "Choose the story\nyou want tonight",
        "Pick the duration, voice, language, mood, profiles and gentle lesson.",
        "Story builder",
    ),
    (
        "03-listen-with-audio.png",
        "03-library.png",
        "Save stories and\nlisten again",
        "Keep favourite stories in your library with audio ready for bedtime.",
        "Story library",
    ),
    (
        "04-parent-friendly-account.png",
        "04-parent-account.png",
        "Built for parents\nand little dreamers",
        "Manage profiles, plans, story limits and saved adventures in one calm place.",
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


def fit_inside(image, size):
    target_width, target_height = size
    scale = min(target_width / image.width, target_height / image.height)
    return image.resize(
        (round(image.width * scale), round(image.height * scale)),
        Image.Resampling.LANCZOS,
    )


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


def rounded_rect_layer(size, radius, fill, outline=None, width=1):
    layer = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    box = (width // 2, width // 2, size[0] - width // 2 - 1, size[1] - width // 2 - 1)
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)
    return layer


def prepare_source(source_name):
    source = Image.open(SOURCE_DIR / source_name).convert("RGBA")
    if source_name == "03-library.png":
        canvas = Image.new("RGBA", (1080, 1920), (12, 16, 52, 255))
        draw = ImageDraw.Draw(canvas)
        header_font = font(FONT_BOLD, 42)
        eyebrow_font = font(FONT_BOLD, 18)
        title_font = font(FONT_BOLD, 34)
        body_font = font(FONT_REGULAR, 22)
        badge_font = font(FONT_BOLD, 18)
        button_font = font(FONT_BOLD, 20)
        tab_font = font(FONT_BOLD, 17)

        logo = Image.open(ICON).convert("RGBA").resize((68, 68), Image.Resampling.LANCZOS)
        logo_mask = Image.new("L", logo.size, 0)
        ImageDraw.Draw(logo_mask).rounded_rectangle((0, 0, 68, 68), radius=14, fill=255)
        logo.putalpha(logo_mask)
        canvas.alpha_composite(logo, (74, 58))
        draw.text((158, 70), "SAVED STORIES", font=eyebrow_font, fill=(255, 225, 132, 255))
        draw.text((158, 96), "Library", font=header_font, fill=(255, 255, 255, 255))

        tabs = [("All", True), ("Audio", False), ("Text", False), ("Saved", False), ("Series", False)]
        x = 74
        for label, active in tabs:
            w = 74 if label == "All" else 92
            fill = (255, 216, 132, 255) if active else (27, 31, 78, 255)
            outline = (255, 234, 163, 255) if active else (113, 94, 170, 120)
            text_fill = (25, 17, 58, 255) if active else (232, 226, 255, 235)
            draw.rounded_rectangle((x, 170, x + w, 214), radius=12, fill=fill, outline=outline, width=2)
            text_width = draw.textbbox((0, 0), label, font=tab_font)[2]
            draw.text((x + (w - text_width) // 2, 183), label, font=tab_font, fill=text_fill)
            x += w + 12

        draw.rounded_rectangle((760, 170, 1006, 214), radius=12, fill=(27, 31, 78, 255), outline=(113, 94, 170, 120), width=2)
        draw.text((786, 183), "Sort  Newest", font=tab_font, fill=(255, 250, 224, 255))

        def card(y, title, preview, saved=False):
            outline = (255, 226, 122, 255) if saved else (188, 167, 255, 90)
            draw.rounded_rectangle((74, y, 1006, y + 300), radius=18, fill=(9, 13, 45, 248), outline=outline, width=3)
            if saved:
                draw.rounded_rectangle((104, y + 24, 214, y + 58), radius=17, fill=(255, 226, 122, 255))
                draw.text((133, y + 31), "Saved", font=badge_font, fill=(24, 16, 58, 255))
            draw.text((104, y + 82), title, font=title_font, fill=(255, 250, 224, 255))
            draw.text((104, y + 136), preview, font=body_font, fill=(235, 230, 255, 230))
            draw.rounded_rectangle((104, y + 226, 438, y + 280), radius=12, fill=(255, 218, 132, 255))
            draw.text((211, y + 243), "Play Story", font=button_font, fill=(25, 18, 60, 255))
            draw.rounded_rectangle((456, y + 226, 640, y + 280), radius=12, fill=(68, 54, 123, 255))
            draw.text((508, y + 243), "Open", font=button_font, fill=(255, 250, 224, 255))

        card(300, "Rosie and the Moonlit Library", "A gentle adventure saved for tomorrow's bedtime.", saved=True)
        card(632, "The Star That Learned to Shine", "A magical story with audio ready to play.", saved=False)
        card(964, "The Brave Little Cloud", "A calming favourite for sleepy evenings.", saved=True)
        card(1296, "The Sleepy Space Train", "A soft story waiting for lights-out.", saved=False)
        return canvas
    return source


def phone_mockup(source_name):
    phone = Image.new("RGBA", (PHONE_W, PHONE_H), (0, 0, 0, 0))
    shadow = rounded_rect_layer((PHONE_W, PHONE_H), 92, (0, 0, 0, 180))
    shadow = shadow.filter(ImageFilter.GaussianBlur(28))
    phone.alpha_composite(shadow, (0, 18))

    frame = rounded_rect_layer((PHONE_W, PHONE_H), 92, (246, 241, 255, 255))
    phone.alpha_composite(frame, (0, 0))

    inner_margin = 24
    screen_size = (PHONE_W - inner_margin * 2, PHONE_H - inner_margin * 2)
    screen = cover(prepare_source(source_name), screen_size)
    mask = Image.new("L", screen_size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, *screen_size), radius=68, fill=255)
    screen.putalpha(mask)
    phone.alpha_composite(screen, (inner_margin, inner_margin))

    draw = ImageDraw.Draw(phone)
    draw.rounded_rectangle((PHONE_W // 2 - 124, 34, PHONE_W // 2 + 124, 72), radius=19, fill=(5, 7, 22, 235))
    return phone


def build(output_name, source_name, headline, subhead, pill):
    backdrop = cover(Image.open(BACKGROUND).convert("RGB"), (WIDTH, HEIGHT)).convert("RGBA")
    overlay = Image.new("RGBA", (WIDTH, HEIGHT), (6, 9, 42, 52))
    backdrop = Image.alpha_composite(backdrop, overlay)

    glow = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    glow_draw.ellipse((-260, 120, 720, 1110), fill=(157, 102, 255, 90))
    glow_draw.ellipse((560, -220, 1540, 820), fill=(255, 207, 112, 72))
    glow = glow.filter(ImageFilter.GaussianBlur(70))
    backdrop = Image.alpha_composite(backdrop, glow)

    draw = ImageDraw.Draw(backdrop)
    icon = Image.open(ICON).convert("RGBA").resize((96, 96), Image.Resampling.LANCZOS)
    icon_mask = Image.new("L", icon.size, 0)
    ImageDraw.Draw(icon_mask).rounded_rectangle((0, 0, 96, 96), radius=22, fill=255)
    icon.putalpha(icon_mask)
    backdrop.alpha_composite(icon, (92, 82))

    brand_font = font(FONT_BOLD, 34)
    pill_font = font(FONT_BOLD, 24)
    headline_font = font(FONT_BOLD, 104)
    subhead_font = font(FONT_REGULAR, 39)

    draw.text((210, 110), "DREAMSCAPES", font=brand_font, fill=(255, 226, 132, 255))
    draw.rounded_rectangle((92, 222, 92 + 34 + draw.textbbox((0, 0), pill, font=pill_font)[2], 280), radius=29, fill=(255, 226, 132, 235))
    draw.text((109, 238), pill, font=pill_font, fill=(28, 17, 66, 255))
    draw.multiline_text((92, 324), headline, font=headline_font, fill=(255, 255, 255, 255), spacing=4)

    wrapped_subhead = wrap_text(draw, subhead, subhead_font, WIDTH - 184)
    draw.multiline_text((96, 594), wrapped_subhead, font=subhead_font, fill=(242, 236, 255, 245), spacing=8)

    phone = phone_mockup(source_name)
    backdrop.alpha_composite(phone, (PHONE_X, PHONE_Y))
    backdrop.convert("RGB").save(OUTPUT_DIR / output_name, "PNG", optimize=True)


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    for screen in SCREENS:
        build(*screen)


if __name__ == "__main__":
    main()
