"""Strip near-white background from the logo and produce:
  - public/logo.png         (transparent, original-ish size)
  - src/app/icon.png        (256x256 favicon source — Next.js handles the rest)
  - src/app/apple-icon.png  (180x180)

Run:  python scripts/strip-logo-bg.py
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "logo_somthing.png"
OUT_LOGO = ROOT / "public" / "logo.png"
OUT_ICON = ROOT / "src" / "app" / "icon.png"
OUT_APPLE = ROOT / "src" / "app" / "apple-icon.png"

# Anything brighter than this in all RGB channels becomes fully transparent.
WHITE_THRESHOLD = 235
# Edge pixels between threshold and 255 fade out so the line art looks crisp.
SOFT_EDGE_LO = 200
SOFT_EDGE_HI = 250


def strip_white_bg(im: Image.Image) -> Image.Image:
    im = im.convert("RGBA")
    pixels = im.load()
    if pixels is None:
        return im
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            brightness = min(r, g, b)
            if brightness >= WHITE_THRESHOLD:
                pixels[x, y] = (r, g, b, 0)
            elif brightness >= SOFT_EDGE_LO:
                # Linear fade between SOFT_EDGE_LO (opaque) and SOFT_EDGE_HI (clear)
                t = (brightness - SOFT_EDGE_LO) / max(1, SOFT_EDGE_HI - SOFT_EDGE_LO)
                t = max(0.0, min(1.0, t))
                pixels[x, y] = (r, g, b, int(a * (1 - t)))
    return im


def save_resized(im: Image.Image, out_path: Path, size: int) -> None:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    resized = im.resize((size, size), Image.LANCZOS)
    resized.save(out_path, format="PNG", optimize=True)
    print(f"wrote {out_path.relative_to(ROOT)} ({size}x{size})")


def main() -> None:
    if not SRC.exists():
        raise SystemExit(f"missing source logo: {SRC}")

    im = Image.open(SRC)
    transparent = strip_white_bg(im)

    OUT_LOGO.parent.mkdir(parents=True, exist_ok=True)
    transparent.save(OUT_LOGO, format="PNG", optimize=True)
    print(f"wrote {OUT_LOGO.relative_to(ROOT)} ({transparent.width}x{transparent.height})")

    save_resized(transparent, OUT_ICON, 256)
    save_resized(transparent, OUT_APPLE, 180)


if __name__ == "__main__":
    main()
