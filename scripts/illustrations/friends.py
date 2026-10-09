"""Illustrations for /build/friends. Run: python3 scripts/illustrations/friends.py"""

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


def friend_list(k):
    c = k.c
    k.rect(40, 30, 360, 310, fill=c["panel"], stroke=c["line"], rx=14)
    k.text(64, 62, "Friends", 15, weight=600, anchor="start")
    groups = [
        ("In this game", c["accent"], ["Mira", "Kofi"], 1),
        ("Online", c["ok"], ["Sol"], 1),
        ("In another game", c["team_b"], ["Juno"], 1),
        ("Offline", c["muted"], ["Ada"], 0.5),
    ]
    y = 84
    for label, color, names, opacity in groups:
        k.text(64, y + 12, label, 12, color, 700, anchor="start")
        y += 20
        for name in names:
            k.player(84, y + 24, c["ink"], 0.55, opacity)
            k.add(f'<circle cx="96" cy="{y + 22}" r="4.5" fill="{color}" stroke="{c["panel"]}" stroke-width="2"/>')
            k.text(110, y + 18, name, 14, c["ink"], 500, anchor="start", opacity=opacity)
            y += 28
        y += 4

    # Summer's own profile screen, opened over the game.
    k.text(580, 52, "Summer's profile screen", 13, c["muted"], 600)
    k.rect(460, 66, 240, 274, fill=c["panel"], stroke=c["accent"], rx=16, width=2)
    k.player(580, 140, c["accent"], 1.2)
    k.text(580, 168, "Mira", 15, c["ink"], 700)
    for i, label in enumerate(("Add friend", "Message", "Invite to party", "Report")):
        y = 190 + i * 34
        k.rect(488, y, 184, 26, fill=c["accent_soft"] if i < 3 else c["bg"], rx=8)
        k.text(580, y + 17, label, 12, c["no"] if label == "Report" else c["ink"], 600)


def consent(k):
    c = k.c
    # The game asks.
    k.rect(40, 40, 170, 190, fill=c["panel"], stroke=c["line"], rx=14)
    k.text(125, 70, "Your game", 14, weight=600)
    k.device(90, 86, 70, 112)
    k.rect(97, 130, 56, 24, fill=c["accent"], rx=8)
    k.text(125, 146, "Friends", 11, c["bg"], 700)

    k.arrow(222, 135, 266, 135)

    # Summer's consent sheet.
    k.rect(278, 40, 284, 190, fill=c["panel"], stroke=c["accent"], rx=14, width=2)
    k.text(420, 70, "Summer asks the player", 14, weight=600)
    k.text(420, 108, "Let this game see", 13, c["ink"])
    k.text(420, 126, "your friends?", 13, c["ink"])
    k.rect(300, 156, 112, 30, fill=c["accent"], rx=9)
    k.text(356, 176, "Allow", 13, c["bg"], 700)
    k.rect(428, 156, 112, 30, fill=c["bg"], stroke=c["line"], rx=9)
    k.text(484, 176, "Not now", 13, c["ink"], 600)

    # Either answer keeps the game going.
    arrow_to(k, 574, 110, 640, 78, c["ok"])
    arrow_to(k, 574, 160, 640, 192, c["muted"])
    k.rect(652, 40, 188, 76, fill=c["panel"], stroke=c["ok"], rx=14, width=1.5)
    k.text(746, 72, "Friends list appears", 13, c["ok"], 700)
    for i in range(3):
        k.player(712 + i * 34, 104, c["ink"], 0.55)
    k.rect(652, 154, 188, 76, fill=c["panel"], stroke=c["line"], rx=14)
    k.text(746, 186, "Game carries on", 13, c["ink"], 700)
    k.text(746, 210, "list stays private", 12, c["muted"])


if __name__ == "__main__":
    write("friends", "list", friend_list, 740, 370)
    write("friends", "consent", consent, 880, 270)
