"""Illustrations for /build/shared-state. Run: python3 scripts/illustrations/shared-state.py"""

from illo import write


def sparkle(k, x, y, r, color, opacity=1):
    q = r * 0.28
    k.add(
        f'<path d="M {x} {y - r} L {x + q} {y - q} L {x + r} {y} L {x + q} {y + q} L {x} {y + r} '
        f'L {x - q} {y + q} L {x - r} {y} L {x - q} {y - q} Z" fill="{color}" opacity="{opacity}"/>'
    )


def facts(k):
    c = k.c
    k.rect(40, 30, 280, 250, fill=c["panel"], stroke=c["accent"], rx=14, width=2)
    k.text(180, 62, "Server owns the facts", 15, weight=600)
    k.server(64, 96, 48, 76)
    rows = [("Score 3 – 2", c["accent"], c["accent_soft"]), ("Door: open", c["accent"], c["accent_soft"]),
            ("Mira's hand", c["team_b"], c["team_b_soft"])]
    for i, (value, color, soft) in enumerate(rows):
        y = 92 + i * 46
        k.rect(130, y, 170, 34, fill=soft, stroke=color, rx=10, width=1.5)
        k.text(215, y + 22, value, 13, color, 700)

    players = [("Mira", 82, True), ("Kofi", 162, False), ("Sol", 242, False)]
    for name, y, has_hand in players:
        k.rect(560, y - 44, 280, 70, fill=c["panel"], stroke=c["line"], rx=12)
        k.player(596, y + 12, c["ink"], 0.75)
        k.text(596, y - 24, name, 11, c["muted"], 700)
        k.chip(662, y - 9, "3 – 2", c["accent"], 11)
        k.chip(730, y - 9, "open", c["accent"], 11)
        if has_hand:
            k.chip(800, y - 9, "hand", c["team_b"], 11)
    k.arrow(334, 150, 548, 150, c["accent"])
    k.text(441, 136, "sends each fact", 12, c["accent"], 700)
    k.text(441, 172, "to who may see it", 12, c["muted"], 600)
    k.text(440, 300, "shared facts go to everyone; a private fact only to its owner", 12, c["muted"])


def request(k):
    c = k.c
    rows = [(40, "Accepted"), (170, "Refused")]
    for y, label in rows:
        k.text(40, y + 14, label, 15, weight=600, anchor="start")

    def asking(y):
        k.player(80, y + 92, c["accent"], 0.85)
        k.chip(170, y + 66, "Open the door?", c["accent"], 12)
        k.arrow(234, y + 66, 284, y + 66)
        k.server(296, y + 30, 40, 64)

    # Accepted: the door opens for everyone.
    asking(40)
    k.badge(344, 74, ok=True, r=10)
    k.arrow(356, 106, 406, 106)
    k.rect(418, 52, 422, 92, fill=c["panel"], stroke=c["line"], rx=14)
    k.rect(440, 66, 40, 64, fill="none", stroke=c["ok"], rx=4, width=2.2)
    k.add(f'<path d="M 440 66 L 462 74 L 462 138 L 440 130 Z" fill="{c["ok"]}" opacity="0.35"/>')
    k.text(500, 104, "the door opens for everyone", 13, c["ink"], 600, anchor="start")
    for i in range(3):
        k.player(736 + i * 34, 128, c["ink"], 0.65)

    # Refused: only the asker hears why.
    asking(170)
    k.badge(344, 204, ok=False, r=10)
    k.arrow(356, 236, 406, 236, c["no"])
    k.rect(418, 182, 422, 92, fill=c["panel"], stroke=c["line"], rx=14)
    k.chip(560, 228, "Locked: you need the key", c["no"], 12)
    k.player(736, 258, c["accent"], 0.65)
    k.text(788, 232, "only the asker", 12, c["muted"], 600)


def late_join(k):
    c = k.c
    k.text(40, 44, "Joining mid-match", 15, weight=600, anchor="start")
    y = 150
    k.line(60, y, 830, y, c["line"], 3)
    for x, label in ((120, "coin collected"), (330, "coin collected")):
        sparkle(k, x, y - 40, 14, c["accent"], 0.55)
        k.line(x, y - 20, x, y, c["faint"], 2)
        k.text(x, y + 26, label, 11, c["muted"])
    for x, value in ((120, "Score 1"), (330, "Score 2")):
        k.chip(x, y - 78, value, c["muted"], 11)
    # The late player joins here.
    jx = 560
    k.line(jx, 70, jx, 232, c["accent"], 2, "4 5")
    k.text(jx, 248, "a player joins", 12, c["accent"], 700)
    k.player(jx + 70, 214, c["accent"], 0.85)
    k.chip(jx + 150, 120, "Score 2 · Door open", c["ok"], 12)
    k.badge(jx + 238, 120, ok=True)
    k.text(jx + 150, 92, "gets the current facts", 12, c["ok"], 600)
    k.text(225, 214, "earlier sparkles aren't replayed", 12, c["muted"], 600)


if __name__ == "__main__":
    write("shared-state", "facts", facts, 880, 316)
    write("shared-state", "request", request, 880, 290)
    write("shared-state", "late-join", late_join, 880, 270)
