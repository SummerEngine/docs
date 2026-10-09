"""Illustrations for /build/movement. Run: python3 scripts/illustrations/movement.py"""

from illo import write


def trail(k, points, color, opacity=1, r=3.2):
    for i, (x, y) in enumerate(points):
        fade = opacity * (0.35 + 0.65 * (i + 1) / len(points))
        k.add(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{color}" opacity="{fade:.2f}"/>')


def loop(k):
    c = k.c
    panels = [(40, "Your device"), (330, "Server"), (620, "Everyone else")]
    for x, title in panels:
        k.rect(x, 30, 220, 220, fill=c["panel"], stroke=c["line"], rx=14)
        k.text(x + 110, 62, title, 15, weight=600)

    # The owner's device: the character moves at once.
    k.device(115, 80, 70, 116)
    trail(k, [(132, 168), (139, 165), (146, 162)], c["accent"])
    k.player(163, 168, c["accent"], 0.8)
    k.text(150, 226, "moves at once", 13, c["muted"])

    k.arrow(268, 140, 322, 140, c["accent"])
    k.text(295, 112, "position", 12, c["accent"], 700)
    k.text(295, 126, "~20× a second", 11, c["accent"], 600)

    # The server checks each position.
    k.server(413, 92)
    k.badge(462, 96, ok=True, r=10)
    k.text(440, 226, "checks each one", 13, c["muted"])

    k.arrow(558, 140, 612, 140)
    k.text(585, 126, "accepted", 12, c["muted"], 700)

    # Everyone else: smooth motion, slightly in the past.
    for i, (x, y) in enumerate(((680, 150), (770, 190))):
        k.add(
            f'<path d="M {x - 44} {y + 6} Q {x - 22} {y - 18} {x - 4} {y - 4}" fill="none" '
            f'stroke="{c["muted"]}" stroke-width="2" stroke-dasharray="3 5" opacity="0.8"/>'
        )
        k.player(x + 10, y, c["ink"], 0.8)
    k.text(730, 226, "glide smoothly", 13, c["muted"])


def checks(k):
    c = k.c
    panels = [(40, "Normal move"), (330, "Too fast"), (620, "Server moves you")]
    for x, title in panels:
        k.rect(x, 30, 220, 230, fill=c["panel"], stroke=c["line"], rx=14)
        k.text(x + 110, 62, title, 15, weight=600)

    # Normal move: accepted.
    trail(k, [(80 + i * 16, 170 - i * 4) for i in range(6)], c["accent"])
    k.player(196, 156, c["accent"], 0.85)
    k.badge(212, 116, ok=True)
    k.text(150, 232, "accepted", 13, c["ok"], 600)

    # Too fast: refused, snaps back.
    k.player(378, 170, c["accent"], 0.85)
    k.line(398, 160, 492, 120, c["no"], 2.2, "5 5")
    k.player(510, 132, c["no"], 0.85, 0.45)
    k.badge(526, 92, ok=False)
    k.add(
        f'<path d="M 494 150 Q 450 196 404 182" fill="none" stroke="{c["muted"]}" stroke-width="2.2" '
        f'stroke-linecap="round"/>'
        f'<path d="M 412 176 L 403 182 L 413 189" fill="none" stroke="{c["muted"]}" stroke-width="2.2" '
        f'stroke-linecap="round" stroke-linejoin="round"/>'
    )
    k.text(440, 232, "refused: snaps back", 13, c["no"], 600)

    # The server places a player on purpose.
    k.player(668, 176, c["accent"], 0.8, 0.35)
    k.add(
        f'<path d="M 684 150 Q 724 92 772 140" fill="none" stroke="{c["accent"]}" stroke-width="2.2" '
        f'stroke-dasharray="4 5" stroke-linecap="round"/>'
    )
    k.player(790, 176, c["accent"], 0.85)
    k.line(812, 176, 812, 126, c["muted"], 2)
    k.add(f'<path d="M 812 126 L 834 134 L 812 142 Z" fill="{c["accent"]}"/>')
    k.text(730, 232, "respawn, portal, new round", 13, c["muted"], 600)


if __name__ == "__main__":
    write("movement", "loop", loop, 880, 280)
    write("movement", "checks", checks, 880, 290)
