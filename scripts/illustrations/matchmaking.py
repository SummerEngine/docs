"""Illustrations for /build/matchmaking. Run: python3 scripts/illustrations/matchmaking.py"""

from illo import write


def flow(k):
    c = k.c
    panels = [(30, "Search"), (320, "Match found"), (610, "Into the match")]
    for i, (x, title) in enumerate(panels):
        k.rect(x, 30, 240, 230, fill=c["panel"], stroke=c["line"], rx=14)
        k.step(x + 26, 62, i + 1, title)
    k.arrow(280, 160, 310, 160)
    k.arrow(570, 160, 600, 160)

    # 1. One player searching; others are still out there.
    cx, cy = 150, 190
    for r, o in ((44, 0.9), (72, 0.55), (100, 0.25)):
        k.add(
            f'<path d="M {cx - r} {cy - 8} A {r} {r} 0 0 1 {cx + r} {cy - 8}" fill="none" '
            f'stroke="{c["accent"]}" stroke-width="2" stroke-dasharray="4 6" opacity="{o}"/>'
        )
    k.player(cx, cy, c["accent"])
    k.player(66, 176, c["muted"], 0.75, 0.6)
    k.player(236, 170, c["muted"], 0.75, 0.6)
    k.text(cx, 238, "Searching…", 13, c["muted"])

    # 2. A group is found.
    k.rect(342, 128, 196, 76, fill=c["accent_soft"], stroke=c["accent"], rx=14, dash="5 5", width=1.8)
    for i in range(4):
        x = 375 + i * 44
        k.player(x, 190, c["accent"] if i == 0 else c["ink"], 0.9)
    k.text(440, 238, "4 players grouped", 13, c["muted"])

    # 3. One server, one World, everyone in it.
    k.server(632, 112)
    k.rect(704, 104, 132, 100, fill=c["accent_soft"], rx=14)
    for i, (x, y) in enumerate(((744, 145), (796, 145), (744, 192), (796, 192))):
        k.player(x, y, c["accent"] if i == 0 else c["ink"], 0.8)
    k.line(686, 154, 704, 154, c["muted"], 2, "3 4")
    k.text(730, 238, "Same World, one server", 13, c["muted"])


def quick_play(k):
    c = k.c
    k.text(40, 40, "First come, first served", 15, weight=600, anchor="start")
    k.rect(40, 62, 560, 126, fill=c["panel"], stroke=c["line"], rx=14)
    k.rect(52, 72, 238, 106, fill=c["accent_soft"], rx=10)
    for i in range(8):
        x = 82 + i * 62
        first = i < 4
        k.player(x, 150, c["accent"] if first else c["muted"], 1, 1 if first else 0.7)
        k.text(x, 172, ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th"][i], 12, c["muted"])
    k.text(423, 96, "still searching", 12, c["muted"])
    k.arrow(608, 125, 652, 125)
    k.rect(662, 62, 178, 126, fill=c["panel"], stroke=c["accent"], rx=14, width=2)
    k.text(751, 88, "Match", 14, c["accent"], 600)
    for i in range(4):
        k.player(696 + i * 37, 160, c["accent"], 0.8)


def ranked(k):
    c = k.c
    k.text(40, 40, "Similar ratings first; the range widens while a player waits", 15, weight=600, anchor="start")

    def rx(rating):
        return 70 + (rating - 1000) * 0.74

    wide = (rx(1180), rx(1620))
    narrow = (rx(1300), rx(1500))
    k.rect(wide[0], 66, wide[1] - wide[0], 124, stroke=c["accent"], rx=12, dash="5 6", width=1.5)
    k.rect(narrow[0], 78, narrow[1] - narrow[0], 112, fill=c["accent_soft"], rx=10)
    k.text((narrow[0] + narrow[1]) / 2, 96, "at first", 12, c["accent"], 600)
    k.text(wide[0] + 10, 84, "after waiting", 12, c["accent"], 600, anchor="start")

    ratings = [1040, 1210, 1255, 1330, 1470, 1570, 1700, 1880, 1960]
    for r in ratings:
        inside = narrow[0] <= rx(r) <= narrow[1]
        wider = wide[0] <= rx(r) <= wide[1]
        color = c["ink"] if inside else c["muted"]
        k.player(rx(r), 168, color, 0.8, 1 if (inside or wider) else 0.5)
    k.player(rx(1400), 168, c["accent"], 0.95)
    k.text(rx(1400), 132, "you", 12, c["accent"], 700)

    k.line(60, 196, 830, 196, c["line"], 2)
    for r in range(1000, 2001, 200):
        k.line(rx(r), 191, rx(r), 201, c["muted"], 1.5)
        k.text(rx(r), 220, str(r), 12, c["muted"])
    k.text(830, 245, "rating", 12, c["muted"], anchor="end")


def teams(k):
    c = k.c
    k.text(40, 40, "Teams are filled exactly; a party stays together", 15, weight=600, anchor="start")

    # Searching: a party of two plus four solo players.
    k.rect(40, 62, 330, 190, fill=c["panel"], stroke=c["line"], rx=14)
    k.text(60, 88, "Searching", 13, c["muted"], anchor="start")
    k.rect(64, 104, 104, 70, stroke=c["accent"], rx=12, dash="4 4", width=1.8)
    k.text(116, 194, "party", 12, c["accent"], 600)
    k.player(96, 162, c["accent"], 0.85)
    k.player(136, 162, c["accent"], 0.85)
    for i, (x, y) in enumerate(((214, 150), (262, 172), (310, 146), (236, 226))):
        k.player(x, y, c["ink"], 0.85)

    k.arrow(384, 157, 432, 157)

    # Two balanced teams of three.
    for i, (y, color, soft, label) in enumerate(
        ((62, c["accent"], c["accent_soft"], "Team 0"), (162, c["team_b"], c["team_b_soft"], "Team 1"))
    ):
        k.rect(446, y, 394, 90, fill=soft, stroke=color, rx=14, width=2)
        k.text(470, y + 52, label, 14, color, 700, anchor="start")
    k.rect(560, 82, 104, 62, stroke=c["accent"], rx=12, dash="4 4", width=1.8)
    k.player(592, 134, c["accent"], 0.85)
    k.player(632, 134, c["accent"], 0.85)
    k.player(712, 134, c["ink"], 0.85)
    for x in (592, 652, 712):
        k.player(x, 234, c["ink"], 0.85)


def accept(k):
    c = k.c
    rows = [(108, "Everyone accepts"), (232, "Someone declines")]
    for y, label in rows:
        k.text(40, y - 64, label, 15, weight=600, anchor="start")
        k.rect(40, y - 48, 250, 84, fill=c["panel"], stroke=c["line"], rx=14)

    # Row 1: all accept, the match starts.
    for i in range(4):
        x = 85 + i * 54
        k.player(x, 128, c["ink"], 0.85)
        k.badge(x + 11, 88, ok=True)
    k.arrow(304, 86, 352, 86)
    k.server(366, 52, 40, 64)
    k.text(422, 91, "Match starts", 14, c["ok"], 600, anchor="start")

    # Row 2: one declines and leaves; the others keep their place.
    for i in range(4):
        x = 85 + i * 54
        k.player(x, 252, c["ink"], 0.85)
        k.badge(x + 11, 212, ok=(i != 2))
    k.arrow(304, 210, 352, 210)
    k.rect(366, 172, 300, 84, fill=c["panel"], stroke=c["line"], rx=14)
    k.text(380, 192, "Back to searching, same place in line", 12, c["muted"], anchor="start")
    for i, x in enumerate((404, 450, 496)):
        k.player(x, 246, c["ink"], 0.85)
    k.player(560, 246, c["muted"], 0.7, 0.45)
    k.player(606, 246, c["muted"], 0.7, 0.45)
    k.arrow(694, 214, 734, 214, c["no"], 2)
    k.player(770, 236, c["no"], 0.85, 0.75)
    k.text(770, 270, "leaves the queue", 12, c["no"], 600)


if __name__ == "__main__":
    write("matchmaking", "flow", flow, 880, 290)
    write("matchmaking", "quick-play", quick_play, 880, 230)
    write("matchmaking", "ranked", ranked, 880, 260)
    write("matchmaking", "teams", teams, 880, 276)
    write("matchmaking", "accept", accept, 880, 290)
