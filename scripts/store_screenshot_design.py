"""Shared design for the App Store screenshots (iPhone and iPad).

Each screenshot is one idea: a big two-tone headline you can read at the size
the App Store shows search results, the real app screen in a device frame, and
one piece of that screen lifted out and enlarged so the eye lands on it first.
A different accent colour per screenshot keeps the set reading as five distinct
reasons to download, rather than five variations of one.

Sources are captures of the running app. Callout regions are given in source
pixels, measured from the live DOM, so they always frame real UI.
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
BACKGROUND = ROOT / "store-assets" / "android" / "promotional-screenshots" / "dreamscapes-promo-background.png"
ICON = ROOT / "store-assets" / "android" / "play-store-icon-512.png"

FONT_BOLD = "/System/Library/Fonts/Supplemental/Arial Rounded Bold.ttf"
FONT_REGULAR = "/System/Library/Fonts/Avenir Next.ttc"
FONT_REGULAR_INDEX = 0  # Avenir Next Regular

WHITE = (255, 255, 255, 255)
SUBHEAD = (232, 224, 255, 255)
GOLD = (255, 217, 106, 255)
INK = (28, 17, 66, 255)

# One accent per idea, all from the app's own palette.
ACCENTS = {
    "gold": (255, 217, 106),
    "peach": (255, 179, 138),
    "pink": (255, 143, 183),
    "lilac": (185, 162, 242),
    "sky": (128, 216, 255),
    "mint": (138, 215, 189),
}


def font(path, size, index=0):
    return ImageFont.truetype(path, size=size, index=index)


def cover(image, size):
    tw, th = size
    scale = max(tw / image.width, th / image.height)
    resized = image.resize((round(image.width * scale), round(image.height * scale)), Image.Resampling.LANCZOS)
    left = (resized.width - tw) // 2
    top = (resized.height - th) // 2
    return resized.crop((left, top, left + tw, top + th))


def rounded_mask(size, radius):
    mask = Image.new("L", size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size[0] - 1, size[1] - 1), radius=radius, fill=255)
    return mask


def soft_shadow(size, radius, blur, alpha):
    pad = blur * 3
    layer = Image.new("RGBA", (size[0] + pad * 2, size[1] + pad * 2), (0, 0, 0, 0))
    ImageDraw.Draw(layer).rounded_rectangle(
        (pad, pad, pad + size[0], pad + size[1]), radius=radius, fill=(0, 0, 0, alpha)
    )
    return layer.filter(ImageFilter.GaussianBlur(blur)), pad


def wrap(draw, text, text_font, max_width):
    lines, line = [], ""
    for word in text.split():
        test = f"{line} {word}".strip()
        if draw.textbbox((0, 0), test, font=text_font)[2] <= max_width:
            line = test
        else:
            if line:
                lines.append(line)
            line = word
    if line:
        lines.append(line)
    return lines


def backdrop(width, height, accent, glow_box):
    """Starry sky, a darkened top for the headline, and a glow in the accent."""
    base = cover(Image.open(BACKGROUND).convert("RGB"), (width, height)).convert("RGBA")
    base = Image.alpha_composite(base, Image.new("RGBA", (width, height), (6, 9, 42, 70)))

    # Darken the top third so the headline always reads, whatever the sky does.
    shade = Image.new("L", (1, height), 0)
    for y in range(height):
        t = max(0.0, 1 - y / (height * 0.42))
        shade.putpixel((0, y), int(150 * t * t))
    top = Image.new("RGBA", (width, height), (6, 9, 42, 255))
    top.putalpha(shade.resize((width, height)))
    base = Image.alpha_composite(base, top)

    glow = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    ImageDraw.Draw(glow).ellipse(glow_box, fill=accent + (120,))
    glow = glow.filter(ImageFilter.GaussianBlur(width // 9))
    return Image.alpha_composite(base, glow)


def draw_brand(canvas, y, icon_size, text_size):
    draw = ImageDraw.Draw(canvas)
    brand_font = font(FONT_BOLD, text_size)
    label = "DreamScapes"
    text_w = draw.textbbox((0, 0), label, font=brand_font)[2]
    gap = icon_size // 4
    total = icon_size + gap + text_w
    x = (canvas.width - total) // 2
    icon = Image.open(ICON).convert("RGBA").resize((icon_size, icon_size), Image.Resampling.LANCZOS)
    icon.putalpha(rounded_mask(icon.size, icon_size // 4))
    canvas.alpha_composite(icon, (x, y))
    text_y = y + (icon_size - draw.textbbox((0, 0), label, font=brand_font)[3]) // 2 - 2
    draw.text((x + icon_size + gap, text_y), label, font=brand_font, fill=GOLD)
    return y + icon_size


def draw_headline(canvas, top, lines, accent, size, line_gap):
    """Centred headline. Each line is (text, use_accent)."""
    head_font = font(FONT_BOLD, size)
    shadow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    sdraw = ImageDraw.Draw(shadow)
    draw = ImageDraw.Draw(canvas)
    y = top
    positions = []
    for text, use_accent in lines:
        w = draw.textbbox((0, 0), text, font=head_font)[2]
        x = (canvas.width - w) // 2
        positions.append((x, y, text, use_accent))
        sdraw.text((x, y + 6), text, font=head_font, fill=(0, 0, 0, 170))
        y += size + line_gap
    canvas.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(size // 10)))
    for x, py, text, use_accent in positions:
        draw.text((x, py), text, font=head_font, fill=(accent + (255,)) if use_accent else WHITE)
    return y - line_gap


def draw_subhead(canvas, top, text, size, max_width):
    sub_font = font(FONT_REGULAR, size, FONT_REGULAR_INDEX)
    draw = ImageDraw.Draw(canvas)
    y = top
    for line in wrap(draw, text, sub_font, max_width):
        w = draw.textbbox((0, 0), line, font=sub_font)[2]
        draw.text(((canvas.width - w) // 2, y), line, font=sub_font, fill=SUBHEAD)
        y += int(size * 1.3)
    return y


def device(source, screen_w, bezel, radius, crop_bottom=0):
    """The app screen inside a device frame. Returns the frame and the scale."""
    screen_src = source.crop((0, 0, source.width, source.height - crop_bottom))
    scale = screen_w / screen_src.width
    screen_h = round(screen_src.height * scale)
    screen = screen_src.resize((screen_w, screen_h), Image.Resampling.LANCZOS)

    frame_w, frame_h = screen_w + bezel * 2, screen_h + bezel * 2
    frame = Image.new("RGBA", (frame_w, frame_h), (0, 0, 0, 0))
    fdraw = ImageDraw.Draw(frame)
    fdraw.rounded_rectangle((0, 0, frame_w - 1, frame_h - 1), radius=radius, fill=(14, 12, 34, 255))
    # A thin light rim reads as glass and metal against the dark sky.
    fdraw.rounded_rectangle(
        (2, 2, frame_w - 3, frame_h - 3), radius=radius - 2, outline=(255, 255, 255, 70), width=3
    )
    screen.putalpha(rounded_mask(screen.size, radius - bezel))
    frame.alpha_composite(screen, (bezel, bezel))
    return frame, scale


def draw_callout(canvas, source, region, scale, origin, zoom, accent, tilt, radius, dy=0):
    """Lift one piece of the real screen out of the device, enlarged, in place."""
    x0, y0, x1, y1 = region
    piece = source.crop(region)
    w, h = round((x1 - x0) * scale * zoom), round((y1 - y0) * scale * zoom)
    piece = piece.resize((w, h), Image.Resampling.LANCZOS)
    piece.putalpha(rounded_mask(piece.size, radius))

    border = max(4, radius // 7)
    card = Image.new("RGBA", (w + border * 2, h + border * 2), (0, 0, 0, 0))
    ImageDraw.Draw(card).rounded_rectangle(
        (0, 0, card.width - 1, card.height - 1), radius=radius + border, fill=accent + (255,)
    )
    card.alpha_composite(piece, (border, border))

    shadow, pad = soft_shadow(card.size, radius + border, blur=max(18, w // 28), alpha=190)
    rotated_card = card.rotate(tilt, resample=Image.Resampling.BICUBIC, expand=True)
    rotated_shadow = shadow.rotate(tilt, resample=Image.Resampling.BICUBIC, expand=True)

    # Centre the enlarged piece on where that piece sits on the device screen.
    # dy nudges it down where enlarging would cover the heading above it.
    cx = origin[0] + ((x0 + x1) / 2) * scale
    cy = origin[1] + ((y0 + y1) / 2) * scale + dy
    canvas.alpha_composite(
        rotated_shadow,
        (round(cx - rotated_shadow.width / 2), round(cy - rotated_shadow.height / 2 + w // 40)),
    )
    canvas.alpha_composite(rotated_card, (round(cx - rotated_card.width / 2), round(cy - rotated_card.height / 2)))


def draw_badge(canvas, text, centre, size, tilt):
    badge_font = font(FONT_BOLD, size)
    draw = ImageDraw.Draw(canvas)
    tw = draw.textbbox((0, 0), text, font=badge_font)[2]
    th = draw.textbbox((0, 0), text, font=badge_font)[3]
    pad_x, pad_y = size, int(size * 0.62)
    badge = Image.new("RGBA", (tw + pad_x * 2, th + pad_y * 2), (0, 0, 0, 0))
    bdraw = ImageDraw.Draw(badge)
    bdraw.rounded_rectangle((0, 0, badge.width - 1, badge.height - 1), radius=badge.height // 2, fill=GOLD)
    bdraw.text((pad_x, pad_y - int(size * 0.08)), text, font=badge_font, fill=INK)
    shadow, _ = soft_shadow(badge.size, badge.height // 2, blur=size // 2, alpha=170)
    badge = badge.rotate(tilt, resample=Image.Resampling.BICUBIC, expand=True)
    shadow = shadow.rotate(tilt, resample=Image.Resampling.BICUBIC, expand=True)
    # Keep the whole badge on the canvas, however long its text.
    margin = size
    cx = max(margin + badge.width // 2, min(centre[0], canvas.width - margin - badge.width // 2))
    cy = centre[1]
    canvas.alpha_composite(shadow, (cx - shadow.width // 2, cy - shadow.height // 2 + size // 3))
    canvas.alpha_composite(badge, (cx - badge.width // 2, cy - badge.height // 2))
