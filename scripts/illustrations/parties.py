"""Illustrations for /build/parties. Run: python3 scripts/illustrations/parties.py"""

from illo import write


def crown(k, x, y, color=None):
    """A small crown centred on (x, y), marking the party leader."""
    color = color or k.c["accent"]
    k.add(
        f'<path d="M {x - 9} {y + 5} L {x - 9} {y - 4} L {x - 4.5} {y + 0.5} L {x} {y - 6} '
        f'L {x + 4.5} {y + 0.5} L {x + 9} {y - 4} L {x + 9} {y + 5} Z" fill="{color}" '
        f'stroke="{color}" stroke-width="1.5" stroke-linejoin="round"/>'
    )


def flow(k):
    c = k.c
    panels = [(30, "Party up"), (320, "Leader presses Play"), (610, "Into one match")]
    for i, (x, title) in enumerate(panels):
        k.rect(x, 30, 240, 230, fill=c["panel"], stroke=c["line"], rx=14)
        k.step(x + 26, 62, i + 1, title)
    k.arrow(280, 160, 310, 160)
    k.arrow(570, 160, 600, 160)

    # 1. A party of three in the Summer app.
    k.rect(58, 118, 184, 92, stroke=c["accent"], rx=14, dash="4 4", width=1.8)
    for i, x in enumerate((100, 150, 200)):
        k.player(x, 190, c["accent"], 0.9)
    crown(k, 100, 146)
    k.text(150, 238, "Friends in a Summer party", 13, c["muted"])

    # 2. The leader searches; members follow the same search.
    cx, cy = 400, 190
    for r, o in ((40, 0.9), (64, 0.5)):
        k.add(
            f'<path d="M {cx - r} {cy - 8} A {r} {r} 0 0 1 {cx + r} {cy - 8}" fill="none" '
            f'stroke="{c["accent"]}" stroke-width="2" stroke-dasharray="4 6" opacity="{o}"/>'
        )
    k.player(cx, cy, c["accent"], 0.9)
    crown(k, cx, cy - 46)
    for x in (480, 522):
        k.player(x, 190, c["accent"], 0.8)
    k.line(462, 176, 428, 176, c["accent"], 2, "3 4")
    k.text(501, 140, "follow", 12, c["accent"], 600)
    k.text(440, 238, "Members follow the search", 13, c["muted"])

    # 3. The whole party lands on the same team in one match.
    k.rect(632, 100, 196, 54, fill=c["accent_soft"], stroke=c["accent"], rx=12, width=2)
    k.text(648, 132, "Team 0", 12, c["accent"], 700, anchor="start")
    for x in (724, 762, 800):
        k.player(x, 146, c["accent"], 0.7)
    k.rect(632, 164, 196, 54, fill=c["team_b_soft"], stroke=c["team_b"], rx=12, width=2)
    k.text(648, 196, "Team 1", 12, c["team_b"], 700, anchor="start")
    for x in (724, 762, 800):
        k.player(x, 210, c["ink"], 0.7)
    k.text(730, 238, "Same match, same team", 13, c["muted"])


def choices(k):
    c = k.c
    k.text(40, 40, "Choose together before the match", 15, weight=600, anchor="start")

    # The leader's choices, seen by everyone.
    k.rect(40, 62, 380, 176, fill=c["panel"], stroke=c["line"], rx=14)
    k.player(80, 128, c["accent"], 0.9)
    crown(k, 80, 84)
    k.text(110, 100, "Leader picks", 13, c["muted"], anchor="start")
    for i, (label, value) in enumerate((("Mode", "Ranked 3v3"), ("Map", "Harbor"))):
        y = 150 + i * 40
        k.rect(64, y, 332, 32, fill=c["bg"], rx=8)
        k.text(80, y + 21, label, 13, c["muted"], anchor="start")
        k.text(380, y + 21, value, 14, c["accent"], 700, anchor="end")

    # Each member's own choices.
    k.rect(460, 62, 380, 176, fill=c["panel"], stroke=c["line"], rx=14)
    k.text(484, 100, "Everyone picks their own", 13, c["muted"], anchor="start")
    members = (("Mira", "Scout", True), ("Kofi", "Medic", True), ("You", "Tank", False))
    for i, (name, role, ready) in enumerate(members):
        y = 118 + i * 38
        you = name == "You"
        k.rect(484, y, 332, 32, fill=c["accent_soft"] if you else c["bg"], rx=8)
        k.player(504, y + 27, c["accent"] if you else c["ink"], 0.5)
        k.text(524, y + 21, name, 13, c["accent"] if you else c["ink"], 700 if you else 500, anchor="start")
        k.text(640, y + 21, role, 13, c["muted"], anchor="start")
        if ready:
            k.badge(780, y + 16, ok=True)
            k.text(764, y + 21, "ready", 12, c["ok"], 600, anchor="end")
        else:
            k.text(796, y + 21, "choosing…", 12, c["muted"], 500, anchor="end")
    k.text(440, 262, "Every member of the party sees the same picks", 12, c["muted"])


def ownership(k):
    c = k.c
    # Summer owns the party itself.
    k.rect(40, 30, 380, 200, fill=c["panel"], stroke=c["line"], rx=14)
    k.text(64, 62, "The Summer app", 15, weight=600, anchor="start")
    for i, item in enumerate(("Invites friends", "Party chat", "Leader, kicks, leaving")):
        y = 84 + i * 42
        k.rect(64, y, 332, 34, fill=c["bg"], rx=8)
        k.badge(86, y + 17, ok=True)
        k.text(104, y + 22, item, 13, c["ink"], 500, anchor="start")

    k.arrow(432, 130, 470, 130)

    # Your game sees the party and brings it into a match.
    k.rect(480, 30, 360, 200, fill=c["panel"], stroke=c["accent"], rx=14, width=2)
    k.text(504, 62, "Your game", 15, c["accent"], 600, anchor="start")
    for i, item in enumerate(("Who's in the party, who leads", "Who has your game open", "Brings everyone into one match")):
        y = 84 + i * 42
        k.rect(504, y, 312, 34, fill=c["accent_soft"], rx=8)
        k.player(526, y + 29, c["accent"], 0.5)
        k.text(546, y + 22, item, 13, c["ink"], 500, anchor="start")


if __name__ == "__main__":
    write("parties", "flow", flow, 880, 290)
    write("parties", "choices", choices, 880, 284)
    write("parties", "ownership", ownership, 880, 260)
