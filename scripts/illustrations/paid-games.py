"""Illustrations for /build/paid-games. Run: python3 scripts/illustrations/paid-games.py"""

from illo import write


def spark(k, x, y, r=6, color=None):
    """A four-pointed Sparks star centred on (x, y)."""
    color = color or k.c["accent"]
    q = r * 0.32
    k.add(
        f'<path d="M {x} {y - r} L {x + q} {y - q} L {x + r} {y} L {x + q} {y + q} '
        f'L {x} {y + r} L {x - q} {y + q} L {x - r} {y} L {x - q} {y - q} Z" fill="{color}"/>'
    )


def ways(k):
    c = k.c
    cards = [
        (30, "Free", "Publish free.", ("Players who like your", "game can tip you.")),
        (320, "30%", "Set a price.", ("Players buy your game once.", "Summer takes 30% of each sale.")),
        (610, "70%", "Sell items for Sparks.", ("You earn 70% of the Sparks", "players spend in your game.")),
    ]
    for x, figure, title, lines in cards:
        k.rect(x, 30, 240, 210, fill=c["panel"], stroke=c["line"], rx=14)
        k.text(x + 28, 96, figure, 40, c["accent"], 700, anchor="start")
        if figure == "70%":
            spark(k, x + 140, 82, 10)
        k.text(x + 28, 138, title, 16, c["ink"], 700, anchor="start")
        for i, line in enumerate(lines):
            k.text(x + 28, 170 + i * 20, line, 13, c["muted"], 500, anchor="start")


def tip(k):
    c = k.c
    # The game page with its Tip button.
    k.rect(40, 30, 250, 220, fill=c["panel"], stroke=c["line"], rx=14)
    k.text(64, 60, "Your game's page", 14, weight=600, anchor="start")
    k.rect(64, 76, 202, 90, fill=c["accent_soft"], rx=10)
    k.rect(64, 182, 96, 32, fill=c["accent"], rx=16)
    k.text(112, 203, "Play", 13, c["bg"], 700)
    k.rect(170, 182, 96, 32, fill=c["panel"], stroke=c["accent"], rx=16, width=2)
    k.text(218, 203, "Tip", 13, c["accent"], 700)

    k.arrow(302, 140, 346, 140)

    # The player picks a tip.
    k.rect(358, 30, 250, 220, fill=c["panel"], stroke=c["accent"], rx=14, width=2)
    k.text(382, 60, "Tip the creator", 14, weight=600, anchor="start")
    for i, amount in enumerate(("200", "500", "1,000", "2,000")):
        x = 382 + (i % 2) * 104
        y = 78 + (i // 2) * 56
        chosen = i == 1
        k.rect(x, y, 96, 44, fill=c["accent_soft"] if chosen else c["bg"], stroke=c["accent"] if chosen else c["line"], rx=10, width=2 if chosen else 1.2)
        spark(k, x + 22, y + 22, 6)
        k.text(x + 36, y + 27, amount, 14, c["ink"], 700, anchor="start")
    k.text(483, 214, "paid in Sparks", 12, c["muted"])

    k.arrow(620, 140, 664, 140)

    # The player keeps a supporter badge; the creator earns.
    k.rect(676, 30, 164, 220, fill=c["panel"], stroke=c["line"], rx=14)
    k.player(758, 120, c["ink"], 1.1)
    k.add(f'<circle cx="774" cy="104" r="11" fill="{c["accent"]}"/>')
    spark(k, 774, 104, 6, c["bg"])
    k.text(758, 150, "supporter badge", 12, c["muted"], 600)
    k.line(696, 168, 820, 168, c["line"], 1.5)
    k.text(758, 196, "You earn 70%", 13, c["ok"], 700)
    k.text(758, 214, "of the Sparks spent", 12, c["muted"])


if __name__ == "__main__":
    write("paid-games", "ways", ways, 880, 270)
    write("paid-games", "tip", tip, 880, 280)
