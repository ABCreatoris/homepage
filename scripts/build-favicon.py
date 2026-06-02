#!/usr/bin/env python3
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance
import base64
import re
import sys
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / '.favicon-src.png'
AVATAR_URL = 'https://foruda.gitee.com/avatar/1778850428833983960/15870069_abcreatoris_1778850428.png'


def download_avatar():
    import urllib.request

    req = urllib.request.Request(AVATAR_URL, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=30) as res:
        SRC.write_bytes(res.read())


def face_crop(img: Image.Image) -> Image.Image:
    w, h = img.size
    side = min(w, h)
    left = (w - side) // 2
    top = max(0, int((h - side) * 0.18))
    return img.crop((left, top, left + side, top + side))


def rounded_icon(crop: Image.Image, size: int, radius_ratio=0.22, sharpen=True):
    im = crop.resize((size, size), Image.LANCZOS)
    if sharpen:
        im = im.filter(ImageFilter.UnsharpMask(radius=1.2, percent=150, threshold=2))
        im = ImageEnhance.Contrast(im).enhance(1.05)
        im = ImageEnhance.Sharpness(im).enhance(1.15)
    radius = max(2, round(size * radius_ratio))
    mask = Image.new('L', (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size - 1, size - 1), radius=radius, fill=255)
    out = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    out.paste(im, (0, 0), mask)
    return out, radius


def png_to_ico(paths):
    images = [Path(p).read_bytes() for p in paths]
    count = len(images)
    header_size = 6 + count * 16
    offset = header_size
    header = bytearray(header_size)
    header[0:2] = (0).to_bytes(2, 'little')
    header[2:4] = (1).to_bytes(2, 'little')
    header[4:6] = (count).to_bytes(2, 'little')
    parts = []
    for i, (p, data) in enumerate(zip(paths, images)):
        size = int(Path(p).stem.rsplit('-', 1)[-1])
        entry = 6 + i * 16
        header[entry] = 0 if size >= 256 else size
        header[entry + 1] = 0 if size >= 256 else size
        header[entry + 4:entry + 6] = (1).to_bytes(2, 'little')
        header[entry + 6:entry + 8] = (32).to_bytes(2, 'little')
        header[entry + 8:entry + 12] = len(data).to_bytes(4, 'little')
        header[entry + 12:entry + 16] = offset.to_bytes(4, 'little')
        offset += len(data)
        parts.append(data)
    return bytes(header) + b''.join(parts)


def main():
    if not SRC.exists():
        download_avatar()

    crop = face_crop(Image.open(SRC).convert('RGBA'))
    tmp = []
    for size in (16, 32, 48):
        icon, _ = rounded_icon(crop, size)
        path = ROOT / f'.favicon-{size}.png'
        icon.save(path)
        tmp.append(path)

    ico = png_to_ico(tmp)
    (ROOT / 'favicon.ico').write_bytes(ico)

    icon32, r32 = rounded_icon(crop, 32)
    png32 = icon32.tobytes()
    png32_path = ROOT / '.favicon-32-out.png'
    icon32.save(png32_path)
    b64 = base64.b64encode(png32_path.read_bytes()).decode()
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" role="img" aria-label="陈新钰">\n'
        f'  <defs>\n'
        f'    <clipPath id="a"><rect width="32" height="32" rx="{r32}"/></clipPath>\n'
        f'  </defs>\n'
        f'  <image href="data:image/png;base64,{b64}" width="32" height="32" '
        f'preserveAspectRatio="xMidYMid slice" clip-path="url(#a)"/>\n'
        f'</svg>'
    )
    (ROOT / 'favicon.svg').write_text(svg)

    svg_uri = 'data:image/svg+xml,' + quote(svg.replace('\n', ''), safe='')
    ico_uri = 'data:image/x-icon;base64,' + base64.b64encode(ico).decode()
    html_path = ROOT / 'index.html'
    html = html_path.read_text()
    html = re.sub(
        r'<link rel="icon" type="image/svg\+xml" href="[^"]*">',
        f'<link rel="icon" type="image/svg+xml" href="{svg_uri}">',
        html,
    )
    html = re.sub(
        r'<link rel="icon" type="image/x-icon" href="[^"]*">',
        f'<link rel="icon" type="image/x-icon" href="{ico_uri}">',
        html,
    )
    html_path.write_text(html)

    for path in tmp + [SRC, png32_path]:
        if path.exists():
            path.unlink()

    print('favicon rebuilt from avatar photo')


if __name__ == '__main__':
    try:
        main()
    except Exception as exc:
        print(exc, file=sys.stderr)
        sys.exit(1)
