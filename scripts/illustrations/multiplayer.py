"""Illustrations for /build/multiplayer. Run: python3 scripts/illustrations/multiplayer.py"""

import math

from illo import write


def arrow_to(k, x1, y1, x2, y2, color=None, width=2.5):
    """An arrow in any direction, head at (x2, y2)."""
    color = color or k.c["muted"]
    angle = math.atan2(y2 - y1, x2 - x1)
    bx, by = x2 - 6 * math.cos(angle), y2 - 6 * math.sin(angle)
    k.line(x1, y1, bx, by, color, width)
    left = (x2 - 10 * math.cos(angle - 0.6), y2 - 10 * math.sin(angle - 0.6))
    right = (x2 - 10 * math.cos(angle + 0.6), y2 - 10 * math.sin(angle + 0.6))
    k.add(
        f'<path d="M {left[0]:.1f} {left[1]:.1f} L {x2} {y2} L {right[0]:.1f} {right[1]:.1f}" fill="none" '
        f'stroke="{color}" stroke-width="{width}" stroke-linecap="round" stroke-linejoin="round"/>'
    )


def window(k, x, y, w, h, title=None):
    """A desktop window with a title bar."""
    c = k.c
    k.rect(x, y, w, h, fill=c["panel"], stroke=c["muted"], rx=10, width=1.8)
    k.line(x, y + 22, x + w, y + 22, c["line"], 1.5)
    for i in range(3):
        k.add(f'<circle cx="{x + 14 + i * 12}" cy="{y + 11}" r="3.5" fill="{c["faint"]}"/>')
    if title:
        k.text(x + w - 10, y + 15, title, 10, c["muted"], 600, anchor="end")


def overview(k):
    c = k.c
    k.rect(40, 30, 320, 240, fill=c["panel"], stroke=c["line"], rx=14)
    k.text(200, 62, "Each player's device", 15, weight=600)
    for i, x in enumerate((70, 170, 270)):
        k.device(x, 88, 60, 100)
        k.player(x + 30, 160, c["accent"] if i == 0 else c["ink"], 0.75)
    k.text(200, 222, "client scene", 13, c["muted"])
    k.text(200, 244, "moves its own player, draws everyone", 12, c["muted"])

    arrow_to(k, 372, 118, 496, 118, c["accent"])
    k.text(434, 104, "moves, requests", 12, c["accent"], 700)
    arrow_to(k, 496, 186, 372, 186, c["muted"])
    k.text(434, 210, "what happened", 12, c["muted"], 700)

    k.rect(508, 30, 332, 240, fill=c["panel"], stroke=c["accent"], rx=14, width=2)
    k.text(674, 62, "One Summer server per match", 15, weight=600)
    k.server(540, 96)
    k.text(567, 210, "server scene", 13, c["muted"])
    for i, value in enumerate(("checks every move", "owns the score, doors, items", "decides who won")):
        y = 118 + i * 34
        k.add(f'<circle cx="{628}" cy="{y - 4}" r="4" fill="{c["accent"]}"/>')
        k.text(642, y, value, 13, c["ink"], 500, anchor="start")


def words(k):
    c = k.c
    k.rect(40, 30, 250, 200, fill=c["panel"], stroke=c["line"], rx=14)
    k.text(64, 62, "Queue", 15, weight=600, anchor="start")
    k.text(266, 62, "“casual”", 13, c["muted"], anchor="end")
    k.rect(60, 92, 210, 100, fill=c["accent_soft"], rx=12)
    for i in range(3):
        k.player(100 + i * 65, 160, c["ink"], 0.85)
    k.text(165, 214, "players searching", 12, c["muted"])

    arrow_to(k, 302, 130, 356, 130)
    k.text(329, 116, "placed", 12, c["muted"], 600)

    k.rect(368, 30, 472, 200, fill=c["panel"], stroke=c["accent"], rx=14, width=2)
    k.text(392, 62, "World", 15, c["accent"], 700, anchor="start")
    k.text(816, 62, "one running match, one server", 13, c["muted"], anchor="end")
    for i in range(4):
        x = 392 + i * 110
        filled = i < 3
        k.rect(x, 86, 94, 116, fill=c["accent_soft"] if filled else "none", stroke=c["accent"] if filled else c["faint"], rx=12, dash=None if filled else "4 5", width=1.6)
        if filled:
            k.player(x + 47, 158, c["ink"], 0.85)
            k.badge(x + 62, 112, ok=True)
            k.text(x + 47, 188, "Session", 12, c["accent"], 700)
        else:
            k.text(x + 47, 150, "free seat", 12, c["muted"])
    k.text(616, 252 - 6, "a Session is one player's verified seat", 12, c["muted"])


def local_play(k):
    c = k.c
    window(k, 40, 40, 200, 150, "Summer")
    k.rect(60, 80, 160, 90, fill=c["bg"], rx=6)
    k.rect(96, 108, 88, 34, fill=c["accent"], rx=17)
    k.add(f'<path d="M 120 117 L 120 133 L 133 125 Z" fill="{c["bg"]}"/>')
    k.text(158, 130, "Play", 13, c["bg"], 700)
    k.text(140, 218, "Debug > Local Multiplayer", 12, c["muted"])

    arrow_to(k, 252, 115, 302, 115)

    k.rect(314, 40, 120, 190, fill=c["panel"], stroke=c["line"], rx=14)
    k.server(347, 70)
    k.text(374, 186, "server scene", 12, c["ink"], 600)
    k.text(374, 204, "in the background", 12, c["muted"])

    for i in range(3):
        x = 458 + i * 130
        window(k, x, 40, 118, 150)
        k.rect(x + 8, 30 + 40, 102, 110, fill=c["accent_soft"], rx=6)
        k.player(x + 59, 150, c["accent"] if i == 0 else c["ink"], 0.85)
        k.text(x + 59, 218, f"Test player {i + 1}", 12, c["muted"], 600)
    k.text(651, 262, "one window per player, side by side", 12, c["muted"])


if __name__ == "__main__":
    write("multiplayer", "overview", overview, 880, 300)
    write("multiplayer", "words", words, 880, 270)
    write("multiplayer", "local-play", local_play, 880, 285)
