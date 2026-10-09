"""Illustrations for /build/console-commands. Run: python3 scripts/illustrations/console-commands.py"""

from xml.sax.saxutils import escape

from illo import write

MONO = "'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace"


def mono(k, x, y, value, size=13, color=None, weight=500):
    color = color or k.c["ink"]
    k.add(
        f'<text x="{x}" y="{y}" font-family="{MONO}" font-size="{size}" font-weight="{weight}" '
        f'fill="{color}">{escape(value)}</text>'
    )


def back_arrow(k, x1, y, x2, color):
    """A leftward arrow from x1 to x2 at height y."""
    k.line(x1, y, x2 + 6, y, color, 2.5)
    k.add(
        f'<path d="M {x2 + 9} {y - 6} L {x2} {y} L {x2 + 9} {y + 6}" fill="none" stroke="{color}" '
        f'stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>'
    )


def flow(k):
    c = k.c
    # The dashboard console.
    k.rect(40, 30, 300, 200, fill=c["panel"], stroke=c["line"], rx=14)
    k.text(64, 62, "Your creator dashboard", 14, weight=600, anchor="start")
    k.rect(60, 86, 260, 34, fill=c["bg"], stroke=c["accent"], rx=8, width=1.5)
    mono(k, 72, 108, '> announce "Restart in 10 min"', 12, c["accent"], 600)
    k.rect(60, 160, 260, 50, fill=c["bg"], rx=8)
    k.badge(80, 185, ok=True)
    mono(k, 96, 190, "Announcement sent", 12, c["ink"])

    k.arrow(352, 103, 412, 103, c["accent"])
    k.text(382, 90, "command", 11, c["accent"], 700)
    back_arrow(k, 412, 185, 352, c["ok"])
    k.text(382, 206, "reply", 11, c["ok"], 700)

    # The World's server runs the game's own handler.
    k.rect(424, 30, 180, 200, fill=c["panel"], stroke=c["line"], rx=14)
    k.text(514, 62, "The World's server", 14, weight=600)
    k.server(487, 82, 54, 84)
    k.chip(514, 196, "your game's code", c["accent"], 11)

    k.arrow(616, 125, 660, 125)

    # Players see the result.
    k.rect(672, 30, 168, 200, fill=c["panel"], stroke=c["line"], rx=14)
    k.text(756, 62, "Players", 14, weight=600)
    k.rect(690, 82, 132, 30, fill=c["accent"], rx=8)
    k.text(756, 102, "Restart in 10 min", 11, c["bg"], 700)
    for x in (712, 756, 800):
        k.player(x, 196, c["ink"], 0.8)


def console(k):
    c = k.c
    k.rect(40, 30, 800, 230, fill=c["panel"], stroke=c["line"], rx=14)
    k.text(64, 62, "World console", 15, weight=600, anchor="start")
    k.text(816, 62, "History", 13, c["muted"], anchor="end")
    entries = [
        ("> help", "announce, status, start_event", True),
        ('> announce "Welcome back"', "Announcement sent", True),
        ("> start_event", "Usage: start_event NAME", None),
    ]
    for i, (command, reply, ok) in enumerate(entries):
        y = 80 + i * 56
        k.rect(60, y, 760, 48, fill=c["bg"], rx=9)
        mono(k, 76, y + 20, command, 13, c["accent"], 600)
        mono(k, 76, y + 38, reply, 12, c["muted"])
        if ok:
            k.badge(796, y + 24, ok=True)


if __name__ == "__main__":
    write("console-commands", "flow", flow, 880, 260)
    write("console-commands", "console", console, 880, 290)
