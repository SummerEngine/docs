"""Illustrations for /build/persistent-worlds. Run: python3 scripts/illustrations/persistent-worlds.py"""

from illo import write


def moon(k, x, y, r=14, color=None):
    """A crescent moon centred on (x, y): the World is asleep."""
    c = k.c
    color = color or c["muted"]
    k.add(
        f'<path d="M {x + r * 0.35} {y - r} A {r} {r} 0 1 0 {x + r} {y + r * 0.35} '
        f'A {r * 0.8} {r * 0.8} 0 0 1 {x + r * 0.35} {y - r} Z" fill="{color}"/>'
    )


def world(k, x, y, w, h, players=0, asleep=False, label=None, highlight=False):
    """A World: a rounded place with a few blocks built in it and its players."""
    c = k.c
    fill = c["bg"] if asleep else c["accent_soft"]
    stroke = c["accent"] if highlight else c["line"]
    k.rect(x, y, w, h, fill=fill, stroke=stroke, rx=14, width=2 if highlight else 1.5)
    block = c["faint"] if asleep else c["accent"]
    for i, (bx, bh) in enumerate(((0.12, 0.28), (0.24, 0.42), (0.36, 0.2))):
        k.rect(x + w * bx, y + h - 12 - h * bh, w * 0.1, h * bh, fill=block, rx=3, opacity=0.8)
    for i in range(players):
        k.player(x + w * 0.62 + i * 26, y + h - 12, c["ink"], 0.65)
    if asleep:
        moon(k, x + w - 26, y + 24, 10)
    if label:
        k.text(x + w / 2, y + h + 22, label, 12, c["muted"], 600)


def lifecycle(k):
    c = k.c
    steps = [
        (30, "Play", False, 2),
        (240, "Saved", False, 2),
        (450, "Asleep", True, 0),
        (660, "Wakes up", False, 1),
    ]
    for i, (x, title, asleep, players) in enumerate(steps):
        k.rect(x, 30, 180, 210, fill=c["panel"], stroke=c["line"], rx=14)
        k.step(x + 24, 60, i + 1, title)
        world(k, x + 18, 92, 144, 104, players, asleep)
        if i < 3:
            k.arrow(x + 186, 144, x + 206, 144, width=2)
    # Save markers on step 2, restore marker on step 4.
    k.chip(330, 220, "checkpoint", c["accent"], 11)
    k.chip(540, 220, "no server running", c["muted"], 11)
    k.chip(750, 220, "restored from save", c["ok"], 11)
    k.chip(120, 220, "same World id", c["muted"], 11)


def what_goes_where(k):
    c = k.c
    k.text(40, 40, "Save the place with the World, the player with the player", 15, weight=600, anchor="start")
    # World save.
    k.rect(40, 62, 380, 196, fill=c["panel"], stroke=c["accent"], rx=14, width=2)
    k.text(64, 92, "World save", 14, c["accent"], 700, anchor="start")
    k.text(64, 112, "belongs to the place", 12, c["muted"], anchor="start")
    world(k, 64, 128, 150, 104, 0)
    for i, item in enumerate(("Walls you built", "Chests and what's in them", "Crops in the field")):
        k.text(232, 160 + i * 28, "• " + item, 13, c["ink"], 500, anchor="start")
    # Player data.
    k.rect(460, 62, 380, 196, fill=c["panel"], stroke=c["line"], rx=14)
    k.text(484, 92, "Player progress", 14, weight=700, anchor="start")
    k.text(484, 112, "follows the player to every World", 12, c["muted"], anchor="start")
    k.player(540, 214, c["accent"], 1.4)
    for i, item in enumerate(("Level and unlocks", "Coins in their pocket", "Settings")):
        k.text(612, 160 + i * 28, "• " + item, 13, c["ink"], 500, anchor="start")


def shared_worlds(k):
    c = k.c
    k.text(40, 40, "A player looking for a shared World joins one with a free seat", 15, weight=600, anchor="start")
    k.player(80, 170, c["accent"])
    k.text(80, 196, "searching", 12, c["muted"])
    # Oldest World is full, the next has room (asleep), a new one starts only if needed.
    world(k, 172, 72, 190, 120, 3, False, "Full: skipped")
    world(k, 392, 72, 190, 120, 0, True, "Free seat: wakes, player joins", True)
    k.rect(612, 72, 190, 120, stroke=c["faint"], rx=14, dash="5 6", width=1.8)
    k.text(707, 138, "New World", 13, c["muted"], 600)
    k.text(707, 214, "Starts only when none has room", 12, c["muted"], 600)
    k.add(
        f'<path d="M 104 128 Q 300 20 470 66" fill="none" stroke="{c["accent"]}" '
        f'stroke-width="2.5" stroke-dasharray="5 6" stroke-linecap="round"/>'
        f'<path d="M 460 58 L 472 67 L 458 72" fill="none" stroke="{c["accent"]}" '
        f'stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>'
    )


def shutdown(k):
    c = k.c
    k.text(40, 40, "Before a planned stop, players get a warning and the World saves", 15, weight=600, anchor="start")
    k.line(70, 120, 820, 120, c["line"], 3)
    marks = [
        (110, "Notice", "Server restarts soon", c["accent"]),
        (330, "Warn players", "“Restarting in 5 minutes”", c["accent"]),
        (550, "Final save", "Everything since the last checkpoint", c["ok"]),
        (770, "Back later", "Same World, restored", c["ink"]),
    ]
    for x, title, detail, color in marks:
        k.add(f'<circle cx="{x}" cy="120" r="9" fill="{color}"/>')
        k.text(x, 94, title, 14, color, 700)
        k.text(x, 154, detail, 12, c["muted"], 500)
    k.rect(468, 166, 164, 30, fill=c["accent_soft"], rx=8)
    k.text(550, 186, "gameplay pauses here", 12, c["accent"], 600)


if __name__ == "__main__":
    write("persistent-worlds", "lifecycle", lifecycle, 880, 270)
    write("persistent-worlds", "what-goes-where", what_goes_where, 880, 284)
    write("persistent-worlds", "shared-worlds", shared_worlds, 880, 240)
    write("persistent-worlds", "shutdown", shutdown, 880, 220)
