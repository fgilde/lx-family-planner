"""Build all web and Android launcher icons from the checked-in master art."""

from pathlib import Path

from PIL import Image, ImageDraw, ImageOps


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets" / "app-icon-master.png"
PUBLIC = ROOT / "public"
ANDROID_RES = ROOT / "android" / "app" / "src" / "main" / "res"

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
    master = square_source()
    save_web_icons(master)
    save_android_icons(master)
    print("LX Family web and Android icons generated.")
