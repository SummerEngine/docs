"""Illustrations for /build/server-size. Run: python3 scripts/illustrations/server-size.py"""

import math

from illo import write

SIZES = [
    ("Small", 256, "256 MB"),
    ("Medium", 512, "512 MB"),
    ("Standard", 1024, "1 GB"),
    ("Large", 4096, "4 GB"),
    ("XL", 8192, "8 GB"),
    ("2XL", 16384, "16 GB"),
    ("4XL", 32768, "32 GB"),
    ("8XL", 65536, "64 GB"),
]


def sizes(k):
    c = k.c
    k.text(40, 40, "Eight sizes, each with more memory and CPU", 15, weight=600, anchor="start")
    base = 236
    for i, (label, mib, memory) in enumerate(SIZES):
        x = 56 + i * 100
        height = 26 + (math.log2(mib) - 8) * 20
        opacity = 0.35 + 0.65 * i / (len(SIZES) - 1)
        k.rect(x, base - height, 72, height, fill=c["accent"], rx=10, opacity=opacity)
        k.text(x + 36, base - height - 10, memory, 12, c["ink"], 600)
        k.text(x + 36, base + 22, label, 13, c["muted"], 600)


def override(k):
    c = k.c
    k.rect(40, 30, 240, 190, fill=c["panel"], stroke=c["accent"], rx=14, width=2)
    k.text(160, 62, "Your game's size", 14, weight=600)
    k.server(133, 84, 54, 84)
    k.chip(160, 190, "Small", c["accent"], 13)

    # The duel uses the game's size; the shared world sets its own.
    k.rect(360, 30, 220, 190, fill=c["panel"], stroke=c["line"], rx=14)
    k.text(470, 62, "Duel", 14, weight=600)
    k.server(450, 100, 40, 62)
    k.chip(470, 190, "uses Small", c["muted"], 12)
    k.line(292, 125, 348, 125, c["muted"], 2, "4 5")

    k.rect(620, 30, 220, 190, fill=c["panel"], stroke=c["line"], rx=14)
    k.text(730, 62, "Shared world", 14, weight=600)
    k.server(696, 78, 68, 100)
    k.chip(730, 196, "own size: XL", c["accent"], 12)


def capacity(k):
    c = k.c
    k.rect(40, 30, 800, 150, fill=c["panel"], stroke=c["line"], rx=14)
    k.text(64, 62, "One World", 15, weight=600, anchor="start")
    k.chip(760, 56, "holds 8 players", c["accent"], 12)
    for i in range(8):
        x = 120 + i * 86
        if i < 6:
            k.player(x, 152, c["ink"])
        else:
            k.rect(x - 20, 104, 40, 52, stroke=c["muted"], rx=12, dash="4 4", width=1.5)
            k.text(x, 135, "free", 11, c["muted"], 600)


if __name__ == "__main__":
    write("server-size", "sizes", sizes, 880, 280)
    write("server-size", "override", override, 880, 250)
    write("server-size", "capacity", capacity, 880, 210)
