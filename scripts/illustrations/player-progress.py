"""Illustrations for /build/player-progress. Run: python3 scripts/illustrations/player-progress.py"""

from illo import write


def eye(k, x, y, color):
    k.add(
        f'<path d="M {x - 11} {y} Q {x} {y - 9} {x + 11} {y} Q {x} {y + 9} {x - 11} {y} Z" '
        f'fill="none" stroke="{color}" stroke-width="2"/><circle cx="{x}" cy="{y}" r="3" fill="{color}"/>'
    )


def lock(k, x, y, color):
    k.add(
        f'<path d="M {x - 5} {y - 3} v -4 a 5 5 0 0 1 10 0 v 4" fill="none" stroke="{color}" stroke-width="2"/>'
        f'<rect x="{x - 8}" y="{y - 3}" width="16" height="12" rx="3" fill="{color}"/>'
    )


def progress_card(k, x, y, w=170):
    c = k.c
    k.rect(x, y, w, 96, fill=c["accent_soft"], stroke=c["accent"], rx=12, width=1.5)
    k.player(x + 30, y + 52, c["accent"], 0.75)
    for i, (label, value) in enumerate((("Level", "7"), ("Coins", "240"), ("Skins", "3"))):
        k.text(x + 56, y + 26 + i * 24, label, 12, c["muted"], 500, anchor="start")
        k.text(x + w - 14, y + 26 + i * 24, value, 13, c["ink"], 700, anchor="end")


def carry_over(k):
    c = k.c
    # Match 1 on one server.
    k.rect(30, 30, 220, 220, fill=c["panel"], stroke=c["line"], rx=14)
    k.text(140, 60, "Monday's match", 14, weight=600)
    k.server(74, 84, 44, 70)
    k.player(170, 150, c["accent"])
    k.chip(140, 200, "+40 coins, level up", c["accent"], 11)

    k.arrow(260, 140, 312, 140, c["accent"], 2.5)
    k.text(286, 126, "saves", 12, c["accent"], 700)

    # Summer keeps the progress.
    k.rect(322, 30, 236, 220, fill=c["panel"], stroke=c["accent"], rx=14, width=2)
    k.text(440, 60, "Kept by Summer", 14, c["accent"], 700)
    progress_card(k, 355, 82)
    k.text(440, 212, "for this player, in your game", 12, c["muted"])

    k.arrow(568, 140, 620, 140, c["accent"], 2.5)
    k.text(594, 126, "loads", 12, c["accent"], 700)

    # Match 2 on another server, another device.
    k.rect(630, 30, 220, 220, fill=c["panel"], stroke=c["line"], rx=14)
    k.text(740, 60, "Friday's match", 14, weight=600)
    k.server(664, 84, 44, 70)
    k.device(744, 84, 56, 92)
    k.player(772, 150, c["accent"], 0.7)
    k.text(740, 212, "another server, another device", 12, c["muted"])


def two_slots(k):
    c = k.c
    k.text(40, 40, "Two places to keep progress", 15, weight=600, anchor="start")
    # Public slot.
    k.rect(40, 62, 380, 150, fill=c["panel"], stroke=c["line"], rx=14)
    eye(k, 70, 92, c["accent"])
    k.text(92, 97, "The player can see it", 14, c["accent"], 700, anchor="start")
    for i, item in enumerate(("Coins and level for the menu", "Unlocks and settings")):
        k.text(64, 132 + i * 26, "• " + item, 13, c["ink"], 500, anchor="start")
    k.text(64, 192, "Your server writes it; the player's game can read it", 12, c["muted"], anchor="start")
    # Secret slot.
    k.rect(460, 62, 380, 150, fill=c["panel"], stroke=c["line"], rx=14)
    lock(k, 490, 94, c["team_b"])
    k.text(512, 97, "Only your server sees it", 14, c["team_b"], 700, anchor="start")
    for i, item in enumerate(("Anti-cheat counters", "Hidden skill or progress values")):
        k.text(484, 132 + i * 26, "• " + item, 13, c["ink"], 500, anchor="start")
    k.text(484, 192, "Never sent to any player's game", 12, c["muted"], anchor="start")


if __name__ == "__main__":
    write("player-progress", "carry-over", carry_over, 880, 280)
    write("player-progress", "two-slots", two_slots, 880, 240)
