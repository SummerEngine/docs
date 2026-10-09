"""Illustrations for /build/hit-detection. Run: python3 scripts/illustrations/hit-detection.py"""

from illo import write


def crosshair(k, x, y, color, r=13):
    k.add(
        f'<g stroke="{color}" stroke-width="2" fill="none" stroke-linecap="round">'
        f'<circle cx="{x}" cy="{y}" r="{r}"/>'
        f'<line x1="{x - r - 6}" y1="{y}" x2="{x - r + 5}" y2="{y}"/>'
        f'<line x1="{x + r - 5}" y1="{y}" x2="{x + r + 6}" y2="{y}"/>'
        f'<line x1="{x}" y1="{y - r - 6}" x2="{x}" y2="{y - r + 5}"/>'
        f'<line x1="{x}" y1="{y + r - 5}" x2="{x}" y2="{y + r + 6}"/></g>'
    )


def wall(k, x, y, w, h):
    c = k.c
    k.rect(x, y, w, h, fill=c["faint"], rx=4)
    for i in range(1, int(h // 18)):
        k.line(x + 2, y + i * 18, x + w - 2, y + i * 18, c["line"], 1.5)


def rewind(k):
    c = k.c
    panels = [(40, "On the shooter's screen"), (460, "On the server, a moment later")]
    for x, title in panels:
        k.rect(x, 30, 380, 230, fill=c["panel"], stroke=c["line"], rx=14)
        k.text(x + 24, 62, title, 15, weight=600, anchor="start")

    # The shooter aims at the target as they see it.
    k.player(90, 190, c["accent"])
    k.line(112, 168, 286, 168, c["accent"], 2.5)
    k.player(300, 190, c["ink"])
    crosshair(k, 300, 168, c["accent"])
    k.text(230, 240, "the target is in the crosshair", 12, c["muted"])

    # The server checks the same moment, although the target moved on.
    k.player(510, 190, c["accent"])
    k.line(532, 168, 706, 168, c["accent"], 2.5)
    k.player(720, 190, c["ink"], 1, 0.35)
    k.badge(738, 140, ok=True, r=10)
    k.add(
        f'<path d="M 744 196 Q 772 206 790 196" fill="none" stroke="{c["muted"]}" stroke-width="2" '
        f'stroke-dasharray="3 4"/>'
    )
    k.player(812, 190, c["ink"])
    k.text(718, 222, "where they were", 11, c["muted"], 600)
    k.text(812, 222, "now", 11, c["muted"], 600)
    k.text(650, 246, "checked against what the shooter saw: hit", 12, c["ok"], 600)


def walls(k):
    c = k.c
    panels = [(40, "Clear line"), (460, "Behind cover")]
    for x, title in panels:
        k.rect(x, 30, 380, 190, fill=c["panel"], stroke=c["line"], rx=14)
        k.text(x + 24, 62, title, 15, weight=600, anchor="start")

    k.player(100, 170, c["accent"])
    k.line(122, 148, 318, 148, c["accent"], 2.5)
    k.player(340, 170, c["ink"])
    k.badge(358, 120, ok=True, r=10)
    k.text(230, 204, "hit", 13, c["ok"], 600)

    k.player(520, 170, c["accent"])
    k.line(542, 148, 640, 148, c["accent"], 2.5)
    wall(k, 642, 96, 26, 96)
    k.player(760, 170, c["ink"])
    k.badge(650, 84, ok=False, r=10)
    k.text(650, 204, "the wall stops the shot", 13, c["no"], 600)


def shapes(k):
    c = k.c
    titles = ["Straight shot", "Cone", "Melee arc", "Projectile"]
    for i, title in enumerate(titles):
        x = 40 + i * 205
        k.rect(x, 30, 185, 180, fill=c["panel"], stroke=c["line"], rx=14)
        k.text(x + 92, 60, title, 14, weight=600)
        k.player(x + 36, 166, c["accent"], 0.8)
        k.player(x + 150, 166, c["ink"], 0.8)
        k.badge(x + 162, 126, ok=True)
    soft = c["accent_soft"]
    acc = c["accent"]
    # Straight shot.
    k.line(94, 148, 172, 148, acc, 2.5)
    # Cone.
    x = 245
    k.add(f'<path d="M {x + 52} 148 L {x + 150} 112 L {x + 150} 184 Z" fill="{soft}" stroke="{acc}" stroke-width="2" stroke-linejoin="round"/>')
    k.player(x + 150, 166, c["ink"], 0.8)
    # Melee arc: a band swept in front of the attacker.
    x = 450
    cx, cy, r1, r2 = x + 56, 148, 46, 100
    import math
    a1, a2 = math.radians(-34), math.radians(34)
    p = lambda r, a: (cx + r * math.cos(a), cy + r * math.sin(a))
    o1, o2, i2, i1 = p(r2, a1), p(r2, a2), p(r1, a2), p(r1, a1)
    k.add(
        f'<path d="M {o1[0]:.1f} {o1[1]:.1f} A {r2} {r2} 0 0 1 {o2[0]:.1f} {o2[1]:.1f} '
        f'L {i2[0]:.1f} {i2[1]:.1f} A {r1} {r1} 0 0 0 {i1[0]:.1f} {i1[1]:.1f} Z" '
        f'fill="{soft}" stroke="{acc}" stroke-width="2" stroke-linejoin="round"/>'
    )
    k.player(x + 150, 166, c["ink"], 0.8)
    k.player(x + 36, 166, c["accent"], 0.8)
    k.badge(x + 162, 126, ok=True)
    # Projectile.
    x = 655
    k.add(
        f'<path d="M {x + 54} 146 Q {x + 96} 86 {x + 138} 140" fill="none" stroke="{acc}" '
        f'stroke-width="2.2" stroke-dasharray="3 6" stroke-linecap="round"/>'
    )
    k.add(f'<circle cx="{x + 104}" cy="{104}" r="7" fill="{acc}"/>')
    k.player(x + 150, 166, c["ink"], 0.8)
    k.text(440, 236, "your game picks the shape; Summer supplies the moment the player saw", 12, c["muted"])


if __name__ == "__main__":
    write("hit-detection", "rewind", rewind, 880, 290)
    write("hit-detection", "walls", walls, 880, 250)
    write("hit-detection", "shapes", shapes, 880, 256)
