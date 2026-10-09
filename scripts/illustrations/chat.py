"""Illustrations for /build/chat. Run: python3 scripts/illustrations/chat.py"""

from illo import write


def bubble(k, x, y, text, color=None, fill=None, w=None):
    """A speech bubble whose tail points down-left at (x, y)."""
    c = k.c
    color = color or c["ink"]
    fill = fill or c["accent_soft"]
    w = w or 18 + len(text) * 7.2
    k.add(
        f'<path d="M {x} {y} l 6 -10 h {w - 12} a 8 8 0 0 0 8 -8 v -12 a 8 8 0 0 0 -8 -8 '
        f'h {-(w - 4)} a 8 8 0 0 0 -8 8 v 12 a 8 8 0 0 0 4 7 z" fill="{fill}"/>'
    )
    k.text(x + w / 2, y - 22, text, 12, color, 600)


def shield(k, x, y, s=1.0, mark=True):
    c = k.c
    k.add(
        f'<path d="M {x} {y - 26 * s} l {22 * s} {8 * s} v {14 * s} c 0 {14 * s} {-10 * s} {24 * s} {-22 * s} {30 * s} '
        f'c {-12 * s} {-6 * s} {-22 * s} {-16 * s} {-22 * s} {-30 * s} v {-14 * s} z" fill="{c["accent"]}"/>'
    )
    if not mark:
        return
    k.add(
        f'<path d="M {x - 8 * s} {y + 2 * s} l {6 * s} {6 * s} l {11 * s} {-12 * s}" fill="none" '
        f'stroke="{c["bg"]}" stroke-width="{3 * s}" stroke-linecap="round" stroke-linejoin="round"/>'
    )


def flow(k):
    c = k.c
    # A player sends.
    k.rect(40, 30, 200, 190, fill=c["panel"], stroke=c["line"], rx=14)
    k.text(140, 60, "A player sends", 14, weight=600)
    bubble(k, 72, 128, "gg, well played")
    k.player(80, 184, c["accent"])

    k.arrow(252, 125, 300, 125)

    # Summer handles the safety.
    k.rect(312, 30, 236, 190, fill=c["panel"], stroke=c["accent"], rx=14, width=2)
    k.text(430, 60, "Summer", 14, c["accent"], 700)
    shield(k, 430, 112, 1.1)
    for x, label in ((352, "filter"), (414, "blocks"), (492, "rate limits")):
        k.chip(x, 178, label, c["accent"], 11)

    k.arrow(560, 125, 608, 125)

    # Everyone in the World sees it.
    k.rect(620, 30, 220, 190, fill=c["panel"], stroke=c["line"], rx=14)
    k.text(730, 60, "Everyone in the World", 14, weight=600)
    for i, x in enumerate((672, 730, 788)):
        k.player(x, 184, c["ink"], 0.85)
        k.rect(x - 20, 104 + (i % 2) * 18, 40, 22, fill=c["accent_soft"], rx=8)
        k.line(x - 10, 115 + (i % 2) * 18, x + 10, 115 + (i % 2) * 18, c["accent"], 3)

    # The game server is not in the path.
    k.server(392, 236, 34, 52)
    k.text(440, 266, "Your game's server: not involved, nothing to moderate", 12, c["muted"], 600, anchor="start")


def filtered(k):
    c = k.c
    rows = [(100, "Passes the filter", True), (220, "Stopped by the filter", False)]
    for y, label, ok in rows:
        k.text(40, y - 62, label, 15, weight=600, anchor="start")
        k.rect(40, y - 46, 200, 84, fill=c["panel"], stroke=c["line"], rx=14)
        k.player(90, y + 28, c["accent"], 0.85)
        bubble(k, 118, y + 2, "nice shot!" if ok else "■■■■ ■■■", fill=c["accent_soft"] if ok else c["faint"])
        k.arrow(252, y, 300, y)
        shield(k, 340, y + 6, 0.8, mark=ok)
        if not ok:
            k.badge(340, y + 4, ok=False, r=9)
        k.arrow(380, y, 428, y, c["ok"] if ok else c["no"])
        k.rect(440, y - 46, 400, 84, fill=c["panel"], stroke=c["line"], rx=14)
    # Allowed: everyone sees it.
    for i, x in enumerate((500, 580, 660, 740)):
        k.player(x, 128, c["ink"], 0.75)
        k.rect(x - 18, 64, 36, 20, fill=c["accent_soft"], rx=7)
    k.text(820, 76, "everyone", 12, c["muted"], 600, anchor="end")
    # Stopped: no one sees it; only the sender is told.
    for x in (580, 660, 740):
        k.player(x, 248, c["muted"], 0.75, 0.5)
    k.player(500, 248, c["accent"], 0.75)
    k.chip(530, 192, "Not sent", c["no"], 11)
    k.text(820, 196, "only the sender is told", 12, c["muted"], 600, anchor="end")


if __name__ == "__main__":
    write("chat", "flow", flow, 880, 310)
    write("chat", "filtered", filtered, 880, 284)
