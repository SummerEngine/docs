"""Illustrations for /build/analytics. Run: python3 scripts/illustrations/analytics.py"""

from xml.sax.saxutils import escape

import math

from illo import write


def arrow_to(k, x1, y1, x2, y2, color=None, width=2.5):
    """An arrow in any direction, ending with its head at (x2, y2)."""
    color = color or k.c["muted"]
    length = math.hypot(x2 - x1, y2 - y1)
    ux, uy = (x2 - x1) / length, (y2 - y1) / length
    k.line(x1, y1, x2 - ux * 6, y2 - uy * 6, color, width)
    px, py = -uy, ux
    a = (x2 - ux * 10 + px * 6, y2 - uy * 10 + py * 6)
    b = (x2 - ux * 10 - px * 6, y2 - uy * 10 - py * 6)
    k.add(
        f'<path d="M {a[0]:.1f} {a[1]:.1f} L {x2} {y2} L {b[0]:.1f} {b[1]:.1f}" fill="none" '
        f'stroke="{color}" stroke-width="{width}" stroke-linecap="round" stroke-linejoin="round"/>'
    )

MONO = "'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace"


def mono(k, x, y, value, size=13, color=None, weight=500, anchor="start"):
    color = color or k.c["ink"]
    k.add(
        f'<text x="{x}" y="{y}" font-family="{MONO}" font-size="{size}" font-weight="{weight}" '
        f'fill="{color}" text-anchor="{anchor}">{escape(value)}</text>'
    )


def sun(k, x, y, r=14):
    c = k.c
    k.add(f'<circle cx="{x}" cy="{y}" r="{r * 0.55}" fill="{c["accent"]}"/>')
    for i in range(8):
        k.add(
            f'<line x1="{x}" y1="{y - r * 0.75}" x2="{x}" y2="{y - r}" stroke="{c["accent"]}" stroke-width="2.5" '
            f'stroke-linecap="round" transform="rotate({i * 45} {x} {y})"/>'
        )


def flow(k):
    c = k.c
    sources = [
        (40, "Players' games", "tutorial_step_shown"),
        (124, "Your server", "coin_collected"),
        (208, "Summer itself", "matched, joined…"),
    ]
    for y, label, event in sources:
        k.rect(40, y, 330, 70, fill=c["panel"], stroke=c["line"], rx=14)
        if label == "Players' games":
            k.device(58, y + 10, 30, 50)
        elif label == "Your server":
            k.server(58, y + 10, 30, 50)
        else:
            sun(k, 73, y + 35)
        k.text(106, y + 30, label, 14, weight=600, anchor="start")
        mono(k, 106, y + 52, event, 12, c["accent"], 600)
        arrow_to(k, 382, y + 35, 456, 140 if y == 124 else (110 if y == 40 else 170))

    # The Analytics tab.
    k.rect(468, 40, 372, 238, fill=c["panel"], stroke=c["accent"], rx=14, width=2)
    k.text(492, 72, "Analytics", 15, weight=600, anchor="start")
    k.text(816, 72, "last 7 days", 12, c["muted"], anchor="end")
    bars = [52, 76, 64, 98, 120, 92, 138]
    for i, h in enumerate(bars):
        k.rect(500 + i * 44, 250 - h, 28, h, fill=c["accent"], rx=6, opacity=0.45 + i * 0.08)
    k.line(492, 252, 816, 252, c["line"], 2)


def event(k):
    c = k.c
    # A good event: a fixed name, with the details in its properties.
    k.rect(40, 30, 470, 180, fill=c["panel"], stroke=c["accent"], rx=14, width=2)
    k.text(64, 62, "One event", 14, c["muted"], 600, anchor="start")
    mono(k, 64, 100, "level_completed", 22, c["accent"], 700)
    k.rect(64, 120, 260, 70, fill=c["bg"], rx=10)
    mono(k, 82, 148, "level:   3", 14, c["ink"])
    mono(k, 82, 174, "seconds: 41", 14, c["ink"])
    k.text(488, 100, "fixed name", 12, c["muted"], 600, anchor="end")
    k.text(488, 160, "details go here", 12, c["muted"], 600, anchor="end")

    # Not this: a value in the name makes a new event for every level.
    k.rect(560, 30, 280, 180, fill=c["panel"], stroke=c["line"], rx=14)
    k.text(584, 62, "Not this", 14, c["no"], 700, anchor="start")
    for i, name in enumerate(("level_3_completed", "level_4_completed", "level_5_completed")):
        y = 98 + i * 32
        mono(k, 584, y, name, 14, c["muted"], 500)
        k.line(582, y - 5, 730, y - 5, c["no"], 1.5, opacity=0.7)
    k.badge(808, 62, ok=False)


if __name__ == "__main__":
    write("analytics", "flow", flow, 880, 310)
    write("analytics", "event", event, 880, 240)
