"""Player-loop illustrations for /build/games-like/*. Run: python3 scripts/illustrations/games_like.py"""

from illo import write

NODE_W = 140
NODE_H = 150
TOP = 44
GAP = 30
LEFT = 30


# Local icons -----------------------------------------------------------------


def party(k, cx, cy, n=2):
    c = k.c
    w = 26 * n + 18
    k.rect(cx - w / 2, cy - 36, w, 52, stroke=c["accent"], rx=12, dash="4 4", width=1.6)
    for i in range(n):
        k.player(cx - (n - 1) * 13 + i * 26, cy + 8, c["accent"], 0.62)


def teams(k, cx, cy, size=5):
    c = k.c
    for row, (color, y) in enumerate(((c["accent"], cy - 16), (c["team_b"], cy + 22))):
        for i in range(size):
            k.player(cx - (size - 1) * 10 + i * 20, y, color, 0.42)


def accepted(k, cx, cy, n=4):
    c = k.c
    for i in range(n):
        x = cx - (n - 1) * 14 + i * 28
        k.player(x, cy + 14, c["ink"], 0.55)
        k.badge(x + 7, cy - 16, ok=True, r=6)


def server_match(k, cx, cy, two_teams=True):
    c = k.c
    k.server(cx - 46, cy - 34, 34, 56)
    colors = (c["accent"], c["team_b"]) if two_teams else (c["accent"], c["accent"])
    for i, (x, y) in enumerate(((cx + 8, cy - 6), (cx + 34, cy - 6), (cx + 8, cy + 26), (cx + 34, cy + 26))):
        k.player(x, y, colors[i // 2], 0.5)


def rating_up(k, cx, cy):
    c = k.c
    k.text(cx, cy - 4, "1415", 24, c["ink"], 700)
    k.chip(cx, cy + 24, "▲ 15", c["ok"], 12)


def results(k, cx, cy):
    c = k.c
    k.text(cx, cy - 22, "Victory", 16, c["ok"], 700)
    k.player(cx - 22, cy + 14, c["accent"], 0.55)
    k.player(cx + 22, cy + 14, c["muted"], 0.55, 0.7)
    k.text(cx - 22, cy + 30, "win", 10, c["ok"], 600)
    k.text(cx + 22, cy + 30, "loss", 10, c["no"], 600)


def world(k, cx, cy, players=3):
    c = k.c
    k.add(f'<circle cx="{cx}" cy="{cy}" r="34" fill="{c["accent_soft"]}" stroke="{c["accent"]}" stroke-width="1.6"/>')
    k.add(
        f'<path d="M {cx - 34} {cy} Q {cx} {cy - 14} {cx + 34} {cy} M {cx - 28} {cy + 18} Q {cx} {cy + 6} {cx + 28} {cy + 18}" '
        f'fill="none" stroke="{c["accent"]}" stroke-width="1.2" opacity="0.6"/>'
    )
    for i in range(players):
        k.player(cx - (players - 1) * 9 + i * 18, cy + 16, c["ink"], 0.45)


def blocks(k, cx, cy):
    c = k.c
    for i, (x, y, fill) in enumerate(
        ((-30, 4, "accent_soft"), (-6, 4, "accent_soft"), (18, 4, "accent_soft"), (-18, -20, "accent_soft"), (6, -20, "accent"))
    ):
        k.rect(cx + x, cy + y, 22, 22, fill=c[fill], stroke=c["accent"], rx=3, width=1.4)
    k.player(cx + 34, cy + 26, c["ink"], 0.55)


def save(k, cx, cy):
    c = k.c
    k.server(cx - 40, cy - 34, 34, 56)
    # A floppy-style save icon.
    x, y = cx + 4, cy - 22
    k.rect(x, y, 40, 40, fill=c["panel"], stroke=c["accent"], rx=5, width=1.8)
    k.rect(x + 9, y + 4, 22, 11, fill=c["accent_soft"], rx=2)
    k.rect(x + 8, y + 23, 24, 13, fill=c["accent"], rx=2)


def moon(k, cx, cy):
    c = k.c
    k.add(f'<circle cx="{cx}" cy="{cy - 6}" r="24" fill="{c["accent"]}" opacity="0.9"/>')
    k.add(f'<circle cx="{cx + 11}" cy="{cy - 14}" r="21" fill="{c["panel"]}"/>')
    k.text(cx + 30, cy - 26, "z", 13, c["muted"], 700)
    k.text(cx + 40, cy - 38, "z", 10, c["muted"], 700)


def device(k, cx, cy):
    c = k.c
    k.device(cx - 22, cy - 38, 44, 72)
    k.player(cx, cy + 10, c["accent"], 0.5)


def crowd(k, cx, cy, n=16):
    c = k.c
    for i in range(n):
        row, col = divmod(i, 4)
        k.player(cx - 33 + col * 22, cy - 22 + row * 18, c["accent"] if i == 0 else c["ink"], 0.34)


def rounds(k, cx, cy):
    c = k.c
    for i, label in enumerate(("1", "2", "3")):
        x = cx - 40 + i * 40
        done = i < 2
        k.add(f'<circle cx="{x}" cy="{cy - 6}" r="15" fill="{c["accent"] if done else c["panel"]}" stroke="{c["accent"]}" stroke-width="1.6"/>')
        k.text(x, cy - 1, label, 13, c["bg"] if done else c["accent"], 700)


def hands(k, cx, cy):
    c = k.c
    # The player's own cards face up, the opponent's face down.
    for i in range(3):
        x = cx - 34 + i * 18
        k.rect(x, cy - 36, 22, 32, fill=c["team_b_soft"], stroke=c["team_b"], rx=4, width=1.4)
    for i in range(3):
        x = cx - 6 + i * 18
        k.rect(x, cy + 2, 22, 32, fill=c["panel"], stroke=c["accent"], rx=4, width=1.6)
        k.add(f'<circle cx="{x + 11}" cy="{cy + 18}" r="4" fill="{c["accent"]}"/>')


def shop(k, cx, cy):
    c = k.c
    k.rect(cx - 28, cy - 40, 56, 46, fill=c["accent_soft"], stroke=c["accent"], rx=10, width=1.6)
    k.add(f'<path d="M {cx - 11} {cy - 17} l 11 -11 l 11 11 l -11 11 z" fill="{c["accent"]}"/>')
    k.chip(cx, cy + 24, "120 Sparks", c["accent"], 10)


def chart(k, cx, cy):
    c = k.c
    for i, h in enumerate((18, 30, 24, 44)):
        k.rect(cx - 34 + i * 18, cy + 22 - h, 12, h, fill=c["accent"] if i == 3 else c["accent_soft"], rx=3)
    k.line(cx - 40, cy + 24, cx + 40, cy + 24, c["muted"], 1.5)


def unlock(k, cx, cy):
    c = k.c
    k.player(cx - 14, cy + 18, c["accent"], 0.7)
    k.rect(cx + 6, cy - 28, 34, 34, fill=c["panel"], stroke=c["ok"], rx=8, width=1.8)
    k.badge(cx + 23, cy - 11, ok=True, r=8)


def fill_team(k, cx, cy):
    c = k.c
    k.rect(cx - 52, cy - 28, 74, 50, stroke=c["accent"], rx=12, dash="4 4", width=1.6)
    for i in range(3):
        k.player(cx - 38 + i * 23, cy + 12, c["accent"], 0.55)
    k.player(cx + 40, cy + 12, c["ink"], 0.55)
    k.text(cx + 40, cy - 22, "+1", 12, c["ok"], 700)


def duel(k, cx, cy):
    c = k.c
    k.player(cx - 28, cy + 16, c["accent"], 0.75)
    k.text(cx, cy + 6, "vs", 14, c["muted"], 700)
    k.player(cx + 28, cy + 16, c["team_b"], 0.75)


def clock(k, cx, cy):
    c = k.c
    k.add(f'<circle cx="{cx}" cy="{cy}" r="28" fill="{c["panel"]}" stroke="{c["accent"]}" stroke-width="2"/>')
    k.line(cx, cy, cx, cy - 18, c["accent"], 2.5)
    k.line(cx, cy, cx + 13, cy + 6, c["accent"], 2.5)


# Layout ----------------------------------------------------------------------


def loop(nodes, again="Play again"):
    """Panels joined left to right, with a return path from the last to the first."""

    def draw(k):
        c = k.c
        n = len(nodes)
        width = (k.w - 2 * LEFT - (n - 1) * GAP) / n
        xs = [LEFT + i * (width + GAP) for i in range(n)]
        for i, (title, caption, icon) in enumerate(nodes):
            x = xs[i]
            k.rect(x, TOP, width, NODE_H, fill=c["panel"], stroke=c["line"], rx=14)
            k.text(x + width / 2, TOP + 26, title, 13, weight=600)
            icon(k, x + width / 2, TOP + 84)
            if caption:
                k.text(x + width / 2, TOP + NODE_H - 12, caption, 11, c["muted"])
            if i:
                k.arrow(x - GAP + 5, TOP + NODE_H / 2, x - 5, TOP + NODE_H / 2)
        if again:
            first = xs[0] + width / 2
            last = xs[-1] + width / 2
            y = TOP + NODE_H
            k.add(
                f'<path d="M {last} {y + 4} V {y + 26} H {first} V {y + 10}" fill="none" stroke="{c["accent"]}" '
                f'stroke-width="2" stroke-dasharray="5 6" stroke-linecap="round"/>'
            )
            k.add(
                f'<path d="M {first - 6} {y + 16} L {first} {y + 7} L {first + 6} {y + 16}" fill="none" '
                f'stroke="{c["accent"]}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'
            )
            label_w = len(again) * 7 + 20
            k.rect((first + last) / 2 - label_w / 2, y + 15, label_w, 22, fill=c["bg"], rx=8)
            k.text((first + last) / 2, y + 30, again, 12, c["accent"], 600)

    return draw


GENRES = {
    "tactical-shooter": [
        ("Party up", "friends together", lambda k, x, y: party(k, x, y, 2)),
        ("Find a 5v5", "matched by skill", lambda k, x, y: teams(k, x, y, 5)),
        ("Accept", "everyone ready", lambda k, x, y: accepted(k, x, y, 4)),
        ("Play the rounds", "one server", server_match),
        ("Rating moves", "win or lose", rating_up),
    ],
    "moba": [
        ("Party up", "duo or more", lambda k, x, y: party(k, x, y, 2)),
        ("Find a 5v5", "balanced teams", lambda k, x, y: teams(k, x, y, 5)),
        ("Accept", "before it starts", lambda k, x, y: accepted(k, x, y, 4)),
        ("Play the match", "one server", server_match),
        ("Result", "rating and board", results),
    ],
    "survival-sandbox": [
        ("Join the world", "from My Worlds", device),
        ("Build together", "everyone sees it", blocks),
        ("World saves", "on the server", save),
        ("World sleeps", "until next time", moon),
        ("Wakes on join", "right where it was", lambda k, x, y: world(k, x, y, 3)),
    ],
    "co-op": [
        ("Party up", "your squad", lambda k, x, y: party(k, x, y, 3)),
        ("Quick play", "fill the team", fill_team),
        ("Play the run", "one server", lambda k, x, y: server_match(k, x, y, two_teams=False)),
        ("Progress saved", "unlocks kept", unlock),
    ],
    "party-games": [
        ("Quick play", "first come", device),
        ("Up to 16", "in one match", lambda k, x, y: crowd(k, x, y, 16)),
        ("Play rounds", "short and loud", rounds),
        ("Results", "wins on the board", results),
    ],
    "card-games": [
        ("Find a duel", "matched by rating", duel),
        ("Take turns", "server keeps time", clock),
        ("Hidden hands", "only yours face up", hands),
        ("Rating moves", "after every game", rating_up),
    ],
    "single-player": [
        ("Play", "on the device", device),
        ("Unlock items", "owned by the account", unlock),
        ("Shop", "Summer checkout", shop),
        ("Learn", "your analytics", chart),
    ],
}


if __name__ == "__main__":
    for slug, nodes in GENRES.items():
        again = "Keep playing" if slug == "single-player" else ("Come back later" if slug == "survival-sandbox" else "Play again")
        write("games-like", slug, loop(nodes, again), 880, 260)
