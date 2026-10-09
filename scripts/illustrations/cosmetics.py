"""Illustrations for /build/cosmetics. Run: python3 scripts/illustrations/cosmetics.py"""

from illo import write


def crown(k, x, y, s=1.0, color=None):
    """A small crown resting on the head of a player standing on (x, y)."""
    color = color or k.c["accent"]
    base = y - 31 * s
    w = 9 * s
    k.add(
        f'<path d="M {x - w} {base} L {x - w} {base - 8 * s} L {x - w / 2} {base - 4 * s} '
        f'L {x} {base - 10 * s} L {x + w / 2} {base - 4 * s} L {x + w} {base - 8 * s} L {x + w} {base} Z" '
        f'fill="{color}"/>'
    )


def equip(k):
    c = k.c
    panels = [(30, "Pick from what you own"), (320, "Server checks"), (610, "Everyone sees it")]
    for i, (x, title) in enumerate(panels):
        k.rect(x, 30, 240, 220, fill=c["panel"], stroke=c["line"], rx=14)
        k.step(x + 26, 62, i + 1, title)
    k.arrow(280, 150, 310, 150)
    k.arrow(570, 150, 600, 150)

    # 1. The player's owned items for the head slot.
    k.text(150, 102, "head slot", 12, c["muted"], 600)
    for i, (colour, chosen) in enumerate(((c["faint"], False), (c["accent"], True), (c["team_b"], False))):
        x = 70 + i * 60
        k.rect(x, 120, 44, 44, fill=c["bg"], stroke=c["accent"] if chosen else c["line"], rx=10, width=2.5 if chosen else 1.5)
        if colour == c["faint"]:
            k.line(x + 12, 142, x + 32, 142, c["muted"], 2)
        else:
            k.add(
                f'<path d="M {x + 10} {154} L {x + 10} {136} L {x + 16} {143} L {x + 22} {132} '
                f'L {x + 28} {143} L {x + 34} {136} L {x + 34} {154} Z" fill="{colour}"/>'
            )
    k.text(150, 196, "the player's own items", 12, c["muted"])

    # 2. The server reads the inventory before it changes anything.
    k.server(374, 104, 50, 78)
    k.arrow(432, 143, 462, 143, c["accent"], 2)
    k.rect(470, 112, 60, 62, fill=c["accent_soft"], rx=10)
    k.badge(500, 143, ok=True, r=11)
    k.text(440, 212, "owned? then equip", 12, c["muted"])

    # 3. Every player sees the chosen crown.
    k.player(730, 176, c["ink"], 1.2)
    crown(k, 730, 176, 1.2)
    for x in (660, 800):
        k.player(x, 186, c["muted"], 0.8, 0.8)
    k.text(730, 222, "the same look for all", 12, c["muted"])


def appearance(k):
    c = k.c
    k.text(40, 40, "Each item you sell maps to a look you made", 15, weight=600, anchor="start")
    rows = [
        (102, "Gold crown", "a scene, attached to the head", "crown"),
        (204, "Night skin", "a material, on the body", "skin"),
    ]
    for y, name, how, kind in rows:
        k.rect(40, y - 36, 800, 84, fill=c["panel"], stroke=c["line"], rx=14)
        k.rect(64, y - 14, 150, 32, fill=c["accent_soft"], stroke=c["accent"], rx=16, width=1.5)
        k.text(139, y + 7, name, 13, c["accent"], 700)
        k.arrow(232, y + 2, 290, y + 2)
        k.text(306, y + 7, how, 14, c["ink"], 500, anchor="start")
        k.arrow(600, y + 2, 660, y + 2)
        if kind == "crown":
            k.player(740, y + 32, c["ink"], 1.05)
            crown(k, 740, y + 32, 1.05)
        else:
            k.player(740, y + 32, c["team_b"], 1.05)


if __name__ == "__main__":
    write("cosmetics", "equip", equip, 880, 280)
    write("cosmetics", "appearance", appearance, 880, 270)
