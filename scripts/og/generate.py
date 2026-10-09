"""Render one share image per docs page: a short label in big white Geist
Black capitals over the summer.games/publish background. Needs Pillow.
Labels live in titles.json; pages without one use their sidebar title.

    python3 scripts/og/generate.py

Writes images/og/<page>.jpg and sets og:image / twitter:image in each page's
frontmatter. Generated pages are skipped; they use the default image.
"""
import json
import re
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
BASE_URL = "https://docs.summerengine.com/images/og"
W, H = 1200, 630
MAX_W = W * 0.86
MAX_H = H * 0.62
MAX_SIZE = 200
ZOOM = 1.4
CROP_TOP = 0.26


def nav_pages(node):
    if isinstance(node, str):
        yield node
    elif isinstance(node, list):
        for item in node:
            yield from nav_pages(item)
    elif isinstance(node, dict):
        for key in ("tabs", "groups", "pages", "anchors", "dropdowns"):
            if key in node:
                yield from nav_pages(node[key])


def font(size):
    f = ImageFont.truetype(str(HERE / "Geist.ttf"), size)
    f.set_variation_by_name("Black")
    return f


def split_lines(words, n):
    """Split words into n lines with the most even widths."""
    if n == 1:
        return [" ".join(words)]
    best = None
    for i in range(1, len(words)):
        head = " ".join(words[:i])
        rest = split_lines(words[i:], n - 1) if len(words) - i >= n - 1 else None
        if not rest:
            continue
        lines = [head] + rest
        score = max(len(l) for l in lines)
        if best is None or score < best[0]:
            best = (score, lines)
    return best[1] if best else [" ".join(words)]


def layout(text, draw):
    words = text.split()
    best = None
    for n in range(1, min(2, len(words)) + 1):
        lines = split_lines(words, n)
        size = MAX_SIZE
        while size > 40:
            f = font(size)
            widths = [draw.textbbox((0, 0), l, font=f) for l in lines]
            line_h = size * 0.98
            if max(b[2] - b[0] for b in widths) <= MAX_W and line_h * n <= MAX_H:
                break
            size -= 4
        if best is None or size > best[0] * 1.15:
            best = (size, lines)
    return best


def render(title, out):
    bg = Image.open(HERE / "background.jpg").convert("RGB")
    # Zoom into the meadow so the sky is only the top fifth and the text sits on grass.
    scale = max(W / bg.width, H / bg.height) * ZOOM
    bg = bg.resize((round(bg.width * scale), round(bg.height * scale)), Image.LANCZOS)
    left, top = (bg.width - W) // 2, min(round(bg.height * CROP_TOP), bg.height - H)
    img = bg.crop((left, top, left + W, top + H))
    draw = ImageDraw.Draw(img)
    size, lines = layout(title.upper(), draw)
    f = font(size)
    line_h = size * 0.98
    y = H * 0.56 - line_h * len(lines) / 2
    for line in lines:
        l, t, r, b = draw.textbbox((0, 0), line, font=f, anchor="ls")
        draw.text(((W - (r - l)) / 2 - l, y + size * 0.78), line, font=f, fill="white", anchor="ls")
        y += line_h
    out.parent.mkdir(parents=True, exist_ok=True)
    img.save(out, "JPEG", quality=84, optimize=True, progressive=True)


def frontmatter_value(fm, key):
    m = re.search(rf'^{key}:\s*(.+)$', fm, re.M)
    return m.group(1).strip().strip("\"'") if m else None


def main():
    config = json.loads((ROOT / "docs.json").read_text())
    pages = list(dict.fromkeys(nav_pages(config["navigation"])))
    labels = json.loads((HERE / "titles.json").read_text())
    for page in pages:
        path = ROOT / f"{page}.mdx"
        if not path.exists():
            continue
        text = path.read_text()
        m = re.match(r"---\n(.*?)\n---\n", text, re.S)
        if not m:
            continue
        fm = m.group(1)
        if re.search(r"^generated:\s*true", fm, re.M):
            continue
        title = labels.get(page) or frontmatter_value(fm, "sidebarTitle") or frontmatter_value(fm, "title")
        if not title:
            continue
        # Flat names: Mintlify does not serve files from folders named "build".
        name = page.replace("/", "-")
        render(title, ROOT / "images/og" / f"{name}.jpg")
        url = f"{BASE_URL}/{name}.jpg"
        fm = re.sub(r'^"(og|twitter):image":.*\n?', "", fm, flags=re.M).rstrip("\n")
        fm += f'\n"og:image": "{url}"\n"twitter:image": "{url}"'
        path.write_text(f"---\n{fm}\n---\n" + text[m.end():])
        print(page, "->", title.upper())


if __name__ == "__main__":
    main()
