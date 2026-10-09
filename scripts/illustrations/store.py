"""Illustrations for /build/store. Run: python3 scripts/illustrations/store.py"""

from illo import write


def spark(k, x, y, r=6, color=None):
    """A four-pointed Sparks star centred on (x, y)."""
    color = color or k.c["accent"]
    q = r * 0.32
    k.add(
        f'<path d="M {x} {y - r} L {x + q} {y - q} L {x + r} {y} L {x + q} {y + q} '
        f'L {x} {y + r} L {x - q} {y + q} L {x - r} {y} L {x - q} {y - q} Z" fill="{color}"/>'
    )


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


def item_row(k, x, y, w, swatch, name, price, highlight=False):
    c = k.c
    k.rect(x, y, w, 34, fill=c["accent_soft"] if highlight else c["bg"], rx=8)
    k.rect(x + 8, y + 7, 20, 20, fill=swatch, rx=5)
    k.text(x + 36, y + 22, name, 12, c["ink"], 600, anchor="start")
    spark(k, x + w - 44, y + 17, 5)
    k.text(x + w - 10, y + 21.5, price, 12, c["ink"], 700, anchor="end")


def checkout(k):
    c = k.c
    xs = (30, 242, 454, 666)
    titles = ("Your shop", "Summer asks", "Inventory", "Your game")
    captions = ("lists items and prices", "the player approves", "Summer adds the item", "unlocks what they own")
    for i, x in enumerate(xs):
        k.rect(x, 30, 184, 220, fill=c["panel"], stroke=c["line"], rx=14)
        k.step(x + 24, 60, i + 1, titles[i])
        k.text(x + 92, 236, captions[i], 12, c["muted"])
        if i < 3:
            k.arrow(x + 190, 140, x + 206, 140)

    # 1. The game's own shop.
    x = xs[0]
    item_row(k, x + 12, 82, 160, c["accent"], "Gold crown", "120", highlight=True)
    item_row(k, x + 12, 122, 160, c["team_b"], "Blue cape", "80")
    k.rect(x + 54, 170, 76, 30, fill=c["accent"], rx=15)
    k.text(x + 92, 190, "Buy", 13, c["bg"], 700)

    # 2. Summer's own purchase sheet.
    x = xs[1]
    k.device(x + 57, 78, 70, 136)
    k.rect(x + 66, 128, 52, 64, fill=c["panel"], rx=6)
    spark(k, x + 82, 142, 5)
    k.text(x + 100, 146, "120", 11, c["ink"], 700)
    k.rect(x + 71, 156, 42, 14, fill=c["ok"], rx=7)
    k.rect(x + 71, 175, 42, 12, stroke=c["muted"], rx=6, width=1)

    # 3. The item lands in the player's inventory.
    x = xs[2]
    swatches = (c["team_b"], c["faint"], c["faint"], c["accent"])
    for i, colour in enumerate(swatches):
        sx = x + 40 + (i % 2) * 60
        sy = 92 + (i // 2) * 62
        k.rect(sx, sy, 44, 44, fill=colour, rx=10, opacity=1 if colour != c["faint"] else 0.6)
    k.rect(x + 96, 150, 52, 52, stroke=c["ok"], rx=12, width=2.5)
    k.badge(x + 146, 152, ok=True)

    # 4. The game sees the item and the player wears it.
    x = xs[3]
    k.player(x + 92, 190, c["ink"], 1.3)
    crown(k, x + 92, 190, 1.3)


def check(k):
    c = k.c
    k.text(40, 40, "Your server checks what a player owns, every time", 15, weight=600, anchor="start")

    # A player's game asks to wear an item.
    k.rect(40, 62, 230, 190, fill=c["panel"], stroke=c["line"], rx=14)
    k.text(155, 88, "Player's game", 13, c["muted"])
    k.device(78, 104, 64, 110)
    k.player(110, 178, c["accent"], 0.8)
    k.rect(160, 120, 96, 44, fill=c["accent_soft"], stroke=c["accent"], rx=12, width=1.5)
    k.text(208, 140, "Wear the", 12, c["ink"], 600)
    k.text(208, 155, "gold crown", 12, c["ink"], 600)

    k.arrow(282, 157, 326, 157)

    # The server reads the inventory itself.
    k.rect(338, 62, 230, 190, fill=c["panel"], stroke=c["line"], rx=14)
    k.text(453, 88, "Your game's server", 13, c["muted"])
    k.server(372, 112)
    k.arrow(436, 154, 470, 154, c["accent"], 2)
    k.rect(478, 116, 74, 76, fill=c["accent_soft"], rx=10)
    k.text(515, 138, "inventory", 11, c["accent"], 700)
    for i, colour in enumerate((c["accent"], c["team_b"], c["faint"])):
        k.rect(488 + i * 20, 150, 16, 16, fill=colour, rx=4)
    k.text(453, 226, "reads it itself", 12, c["muted"])

    k.arrow(580, 120, 624, 104, c["ok"], 2)
    k.arrow(580, 194, 624, 210, c["no"], 2)

    # Owned: everyone sees it. Not owned: refused.
    k.rect(636, 62, 204, 84, fill=c["panel"], stroke=c["ok"], rx=14, width=1.5)
    k.player(676, 128, c["ink"], 0.9)
    crown(k, 676, 128, 0.9)
    k.text(704, 100, "Owned:", 12, c["ok"], 700, anchor="start")
    k.text(704, 118, "everyone sees it", 12, c["ink"], 500, anchor="start")
    k.rect(636, 168, 204, 84, fill=c["panel"], stroke=c["no"], rx=14, width=1.5)
    k.player(676, 234, c["ink"], 0.9)
    k.badge(690, 196, ok=False)
    k.text(704, 206, "Not owned:", 12, c["no"], 700, anchor="start")
    k.text(704, 224, "refused", 12, c["ink"], 500, anchor="start")


if __name__ == "__main__":
    write("store", "checkout", checkout, 880, 280)
    write("store", "check", check, 880, 280)
