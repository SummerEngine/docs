"""Illustrations for /build/publish. Run: python3 scripts/illustrations/publish.py"""

from illo import write


def flow(k):
    c = k.c
    steps = ["Export", "Store page", "Upload", "Review", "Live"]
    notes = ["one .zip file", "in Summer Studio", "checked by Summer", "by Summer staff", "on summer.games"]
    for i, (title, note) in enumerate(zip(steps, notes)):
        x = 30 + i * 168
        last = i == len(steps) - 1
        k.rect(x, 30, 148, 170, fill=c["accent_soft"] if last else c["panel"],
               stroke=c["accent"] if last else c["line"], rx=14, width=2 if last else 1.5)
        k.add(f'<circle cx="{x + 74}" cy="66" r="13" fill="{c["accent"]}"/>')
        k.text(x + 74, 71, str(i + 1), 13, c["bg"], 700)
        cx, cy = x + 74, 120
        if i == 0:  # a zip file
            k.rect(cx - 20, cy - 26, 40, 50, fill=c["bg"], stroke=c["muted"], rx=6, width=2)
            for j in range(4):
                k.rect(cx - 4, cy - 22 + j * 9, 8, 5, fill=c["accent"], rx=1)
        elif i == 1:  # a store page
            k.rect(cx - 32, cy - 26, 64, 50, fill=c["bg"], stroke=c["muted"], rx=6, width=2)
            k.rect(cx - 26, cy - 20, 52, 20, fill=c["accent"], rx=3, opacity=0.8)
            k.line(cx - 26, cy + 8, cx + 14, cy + 8, c["faint"], 4)
            k.line(cx - 26, cy + 16, cx + 4, cy + 16, c["faint"], 4)
        elif i == 2:  # checks
            for j, label in enumerate(("iPhone", "Mac", "Windows")):
                y = cy - 20 + j * 20
                k.badge(cx - 30, y, ok=True, r=7)
                k.text(cx - 16, y + 4, label, 12, c["ink"], 500, anchor="start")
        elif i == 3:  # a reviewer
            k.player(cx, cy + 22, c["ink"], 1)
            k.add(f'<circle cx="{cx + 22}" cy="{cy - 18}" r="10" fill="none" stroke="{c["accent"]}" stroke-width="2.5"/>')
            k.line(cx + 29, cy - 11, cx + 36, cy - 4, c["accent"], 3)
        else:  # live
            k.add(f'<circle cx="{cx}" cy="{cy}" r="24" fill="{c["accent"]}"/>')
            k.add(f'<path d="M {cx - 7} {cy - 11} L {cx + 11} {cy} L {cx - 7} {cy + 11} z" fill="{c["bg"]}"/>')
        k.text(x + 74, 172, title, 14, weight=600)
        k.text(x + 74, 190, note, 12, c["muted"])
        if not last:
            k.arrow(x + 151, 115, x + 165, 115, c["muted"], 2)


def bundle(k):
    c = k.c
    # The single export file and what it holds.
    k.rect(40, 30, 250, 190, fill=c["panel"], stroke=c["line"], rx=14)
    k.text(165, 62, "summer.games export", 14, weight=600)
    k.rect(135, 86, 60, 76, fill=c["bg"], stroke=c["muted"], rx=8, width=2)
    for j in range(5):
        k.rect(160, 92 + j * 12, 10, 6, fill=c["accent"], rx=1)
    k.text(165, 196, "one .zip", 13, c["muted"])

    k.arrow(300, 125, 344, 125)

    parts = [
        ("Your game", "what players download", c["accent"], False),
        ("Your server", "multiplayer games only", c["team_b"], True),
        ("Summer settings", "queues, Worlds, platforms", c["muted"], False),
    ]
    for i, (title, note, color, optional) in enumerate(parts):
        y = 30 + i * 66
        k.rect(358, y, 482, 56, fill=c["panel"], stroke=color, rx=12, dash="5 5" if optional else None, width=1.8)
        k.rect(374, y + 14, 28, 28, fill=color, rx=6, opacity=0.85)
        k.text(418, y + 25, title, 14, weight=600, anchor="start")
        k.text(418, y + 43, note, 12, c["muted"], anchor="start")


def update(k):
    c = k.c
    k.text(40, 40, "Players keep the live version until the new one is promoted", 15, weight=600, anchor="start")
    # Live version.
    k.rect(40, 62, 300, 140, fill=c["accent_soft"], stroke=c["accent"], rx=14, width=2)
    k.text(64, 92, "v1.0.0", 18, c["ink"], 700, anchor="start")
    k.chip(290, 86, "Live", c["accent"], 12)
    for i in range(4):
        k.player(88 + i * 50, 176, c["ink"], 0.8)
    # New version, checked.
    k.arrow(352, 132, 396, 132)
    k.rect(408, 62, 260, 140, fill=c["panel"], stroke=c["line"], rx=14)
    k.text(432, 92, "v1.1.0", 18, c["ink"], 700, anchor="start")
    k.badge(440, 132, ok=True)
    k.text(456, 137, "Checks passed", 13, c["ok"], 600, anchor="start")
    k.text(432, 176, "uploaded, not live yet", 12, c["muted"], anchor="start")
    # Promote.
    k.arrow(680, 132, 724, 132, c["accent"])
    k.rect(734, 92, 106, 80, fill=c["accent"], rx=14)
    k.text(787, 128, "Promote to", 13, c["bg"], 700)
    k.text(787, 146, "production", 13, c["bg"], 700)


if __name__ == "__main__":
    write("publish", "flow", flow, 880, 230)
    write("publish", "bundle", bundle, 880, 250)
    write("publish", "update", update, 880, 230)
