"""Build all web and Android launcher icons from the checked-in master art."""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageOps


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets" / "app-icon-master.png"
PUBLIC = ROOT / "public"
ANDROID_RES = ROOT / "android" / "app" / "src" / "main" / "res"
ICON_BACKGROUND = (6, 81, 60, 255)
SAFE_ART_SCALE = 0.82

ANDROID_SIZES = {
    "mipmap-mdpi": 48,
    "mipmap-hdpi": 72,
    "mipmap-xhdpi": 96,
    "mipmap-xxhdpi": 144,
    "mipmap-xxxhdpi": 192,
}


def square_source() -> Image.Image:
    source = Image.open(SOURCE).convert("RGBA")
    edge = min(source.size)
    return ImageOps.fit(
        source,
        (edge, edge),
        method=Image.Resampling.LANCZOS,
        centering=(0.5, 0.5),
    )


def add_launcher_safe_area(source: Image.Image) -> Image.Image:
    """Inset the complete artwork so Android mask and parallax never clip it."""
    edge = source.width
    art_edge = round(edge * SAFE_ART_SCALE)
    offset = (edge - art_edge) // 2
    background = Image.new("RGBA", source.size, ICON_BACKGROUND)
    composed = background.copy()
    composed.paste(
        source.resize((art_edge, art_edge), Image.Resampling.LANCZOS),
        (offset, offset),
    )

    # Feather the generated green border into the matching launcher background.
    mask = Image.new("L", source.size, 0)
    ImageDraw.Draw(mask).rectangle(
        (offset, offset, offset + art_edge, offset + art_edge),
        fill=255,
    )
    mask = mask.filter(ImageFilter.GaussianBlur(radius=max(2, edge * 0.012)))
    return Image.composite(composed, background, mask)


def save_web_icons(source: Image.Image) -> None:
    PUBLIC.mkdir(parents=True, exist_ok=True)
    for filename, size in (
        ("icon-192.png", 192),
        ("icon-512.png", 512),
        ("icon.png", 512),
    ):
        source.resize((size, size), Image.Resampling.LANCZOS).save(
            PUBLIC / filename,
            "PNG",
            optimize=True,
        )


def save_android_icons(source: Image.Image) -> None:
    for folder, size in ANDROID_SIZES.items():
        target = ANDROID_RES / folder
        target.mkdir(parents=True, exist_ok=True)
        launcher = source.resize((size, size), Image.Resampling.LANCZOS)
        launcher.save(target / "ic_launcher.png", "PNG", optimize=True)

        round_mask = Image.new("L", (size, size), 0)
        ImageDraw.Draw(round_mask).ellipse((0, 0, size - 1, size - 1), fill=255)
        round_icon = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        round_icon.paste(launcher, (0, 0), round_mask)
        round_icon.save(
            target / "ic_launcher_round.png",
            "PNG",
            optimize=True,
        )

        # Android adaptive foregrounds use a 108 dp canvas for a 48 dp icon.
        # The generated master already keeps the symbol inside the safe zone.
        foreground_size = round(size * 2.25)
        foreground = source.resize(
            (foreground_size, foreground_size),
            Image.Resampling.LANCZOS,
        )
        foreground.save(
            target / "ic_launcher_foreground.png",
            "PNG",
            optimize=True,
        )


if __name__ == "__main__":
    master = add_launcher_safe_area(square_source())
    save_web_icons(master)
    save_android_icons(master)
    print("LX Family web and Android icons generated.")
