"""Shared drawing kit for the Build guides' concept illustrations.

Every illustration is drawn once and written in a light and a dark variant,
so pages can switch with the site theme. Only the standard library is used.
"""

from pathlib import Path
from xml.sax.saxutils import escape

ROOT = Path(__file__).resolve().parents[2]

THEMES = {
    "light": {
        "bg": "#fbf7ef",
        "panel": "#ffffff",
        "line": "#e6dcc8",
        "ink": "#2a251b",
        "muted": "#8a806b",
        "faint": "#d8cfbd",
        "accent": "#d9922e",
        "accent_soft": "#f6e3c4",
        "team_b": "#3f7fb0",
        "team_b_soft": "#d7e6f2",
        "ok": "#4f9a55",
        "no": "#c8553d",
    },
    "dark": {
        "bg": "#1b1810",
        "panel": "#242017",
        "line": "#3a3428",
        "ink": "#ede6d6",
        "muted": "#9b927f",
        "faint": "#4a4334",
        "accent": "#f0b566",
        "accent_soft": "#3d3121",
        "team_b": "#7fb3d5",
        "team_b_soft": "#213040",
        "ok": "#8bc48a",
        "no": "#e07a5f",
    },
}

FONT = "Inter, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif"


class Canvas:
    def __init__(self, width, height, theme):
        self.w = width
        self.h = height
        self.c = THEMES[theme]
        self.parts = []

    def add(self, markup):
        self.parts.append(markup)

    def svg(self):
        c = self.c
        body = "\n".join(self.parts)
        return (
            f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {self.w} {self.h}" '
            f'width="{self.w}" height="{self.h}" font-family="{FONT}">\n'
            f'<rect x="0.5" y="0.5" width="{self.w - 1}" height="{self.h - 1}" rx="16" '
            f'fill="{c["bg"]}" stroke="{c["line"]}"/>\n{body}\n</svg>\n'
        )

    # Primitives -----------------------------------------------------------

    def rect(self, x, y, w, h, fill="none", stroke=None, rx=12, dash=None, width=1.5, opacity=1):
        stroke_attr = f' stroke="{stroke}" stroke-width="{width}"' if stroke else ""
        dash_attr = f' stroke-dasharray="{dash}"' if dash else ""
        self.add(
            f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{fill}"'
            f'{stroke_attr}{dash_attr} opacity="{opacity}"/>'
        )

    def text(self, x, y, value, size=14, color=None, weight=500, anchor="middle", opacity=1):
        color = color or self.c["ink"]
        self.add(
            f'<text x="{x}" y="{y}" font-size="{size}" font-weight="{weight}" fill="{color}" '
            f'text-anchor="{anchor}" opacity="{opacity}">{escape(value)}</text>'
        )

    def line(self, x1, y1, x2, y2, color=None, width=2, dash=None, opacity=1):
        color = color or self.c["muted"]
        dash_attr = f' stroke-dasharray="{dash}"' if dash else ""
        self.add(
            f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{color}" '
            f'stroke-width="{width}" stroke-linecap="round"{dash_attr} opacity="{opacity}"/>'
        )

    def arrow(self, x1, y1, x2, y2, color=None, width=2.5):
        color = color or self.c["muted"]
        self.line(x1, y1, x2 - 6, y2, color, width)
        self.add(
            f'<path d="M {x2 - 9} {y2 - 6} L {x2} {y2} L {x2 - 9} {y2 + 6}" fill="none" '
            f'stroke="{color}" stroke-width="{width}" stroke-linecap="round" stroke-linejoin="round"/>'
        )

    # Figures ----------------------------------------------------------------

    def player(self, x, y, color=None, scale=1.0, opacity=1):
        """A player figure standing on (x, y): head plus rounded shoulders."""
        color = color or self.c["ink"]
        s = scale
        self.add(
            f'<g opacity="{opacity}" fill="{color}">'
            f'<circle cx="{x}" cy="{y - 25 * s}" r="{8 * s}"/>'
            f'<path d="M {x - 13 * s} {y} v {-6 * s} a {13 * s} {11 * s} 0 0 1 {26 * s} 0 v {6 * s} z"/>'
            f"</g>"
        )

    def badge(self, x, y, ok=True, r=8):
        c = self.c
        fill = c["ok"] if ok else c["no"]
        if ok:
            mark = f'<path d="M {x - 3.5} {y} l 2.5 2.6 l 4.5 -5" fill="none" stroke="{c["bg"]}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'
        else:
            mark = (
                f'<path d="M {x - 3} {y - 3} l 6 6 M {x + 3} {y - 3} l -6 6" fill="none" '
                f'stroke="{c["bg"]}" stroke-width="2" stroke-linecap="round"/>'
            )
        self.add(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{fill}"/>{mark}')

    def server(self, x, y, w=54, h=84):
        """A server rack with its top-left corner at (x, y)."""
        c = self.c
        self.rect(x, y, w, h, fill=c["panel"], stroke=c["muted"], rx=8, width=2)
        slot = (h - 16) / 3
        for i in range(3):
            sy = y + 8 + i * slot
            self.rect(x + 7, sy + 3, w - 14, slot - 6, fill=c["accent_soft"], rx=4)
            self.add(f'<circle cx="{x + w - 15}" cy="{sy + slot / 2}" r="3" fill="{c["accent"]}"/>')
            self.line(x + 13, sy + slot / 2, x + w - 25, sy + slot / 2, c["muted"], 2)

    def device(self, x, y, w=70, h=116):
        """A phone-shaped player device with its top-left corner at (x, y)."""
        c = self.c
        self.rect(x, y, w, h, fill=c["panel"], stroke=c["muted"], rx=12, width=2)
        self.rect(x + 7, y + 12, w - 14, h - 28, fill=c["accent_soft"], rx=6)
        self.line(x + w / 2 - 8, y + h - 8, x + w / 2 + 8, y + h - 8, c["muted"], 2)

    def chip(self, x, y, value, color=None, size=12):
        """A small rounded label centred on (x, y)."""
        c = self.c
        color = color or c["accent"]
        width = 14 + len(value) * size * 0.58
        self.rect(x - width / 2, y - 12, width, 24, fill=c["panel"], stroke=color, rx=12, width=1.5)
        self.text(x, y + 4.5, value, size, color, 700)

    def step(self, x, y, number, title):
        c = self.c
        self.add(f'<circle cx="{x}" cy="{y}" r="11" fill="{c["accent"]}"/>')
        self.text(x, y + 4.5, str(number), size=12, color=c["bg"], weight=700)
        self.text(x + 20, y + 5, title, size=15, weight=600, anchor="start")


def write(page, name, draw, width, height):
    """Render draw(canvas) for both themes into images/build/<page>/."""
    out = ROOT / "images" / "build" / page
    out.mkdir(parents=True, exist_ok=True)
    for theme in THEMES:
        canvas = Canvas(width, height, theme)
        draw(canvas)
        (out / f"{name}-{theme}.svg").write_text(canvas.svg())
