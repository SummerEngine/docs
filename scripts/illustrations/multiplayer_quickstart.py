"""Hero illustration for /quickstarts/multiplayer-game.

Run: python3 scripts/illustrations/multiplayer_quickstart.py
"""

from illo import write


def hero(k):
    c = k.c
    cx, cy = 440, 160

    # Soft glow rings around the shared World.
    for r, o in ((128, 0.10), (98, 0.18), (72, 0.30)):
        k.add(f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{c["accent"]}" opacity="{o}"/>')

    # Four players on each side, each joined to the World.
    left = [(262, 70), (206, 126), (206, 194), (262, 250)]
    seats = left + [(880 - x, y) for x, y in left]
    for i, (px, py) in enumerate(seats):
        k.line(px, py, cx + (px - cx) * 0.25, cy + (py - cy) * 0.25, c["accent"], 2, "3 6", 0.8)
        k.add(f'<circle cx="{px}" cy="{py}" r="25" fill="{c["panel"]}" stroke="{c["line"]}" stroke-width="1.5"/>')
        k.player(px, py + 14, c["accent"] if i in (1, 6) else c["ink"], 0.8)

    # The World, with its server.
    k.add(f'<circle cx="{cx}" cy="{cy}" r="54" fill="{c["panel"]}" stroke="{c["accent"]}" stroke-width="3"/>')
    k.server(cx - 20, cy - 32, 40, 62)
    k.text(cx, 312, "One World, run by Summer", 14, c["accent"], 700)

    # What Summer runs for you.
    for i, label in enumerate(["Servers", "Matchmaking", "Parties"]):
        k.chip(86, 110 + i * 50, label, c["accent"] if i == 0 else c["muted"], 13)
    for i, label in enumerate(["Saves", "Leaderboards", "Store"]):
        k.chip(794, 110 + i * 50, label, c["muted"], 13)


if __name__ == "__main__":
    write("multiplayer-quickstart", "hero", hero, 880, 330)
