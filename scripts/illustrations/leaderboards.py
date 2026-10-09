"""Illustrations for /build/leaderboards. Run: python3 scripts/illustrations/leaderboards.py"""

from illo import write


def board(k):
    c = k.c
    # The top of a leaderboard, with the player's own row marked.
    k.rect(40, 30, 470, 250, fill=c["panel"], stroke=c["line"], rx=14)
    k.text(64, 62, "Leaderboard", 15, weight=600, anchor="start")
    k.text(486, 62, "Top 50 · Ranked", 13, c["muted"], anchor="end")
    rows = [("1", "Mira", "2140"), ("2", "Kofi", "2095"), ("3", "Sol", "2051"), ("4", "Juno", "1998"), ("5", "You", "1987")]
    for i, (rank, name, value) in enumerate(rows):
        y = 80 + i * 38
        you = name == "You"
        if you:
            k.rect(52, y, 446, 34, fill=c["accent_soft"], stroke=c["accent"], rx=9, width=1.5)
        color = c["accent"] if you else c["ink"]
        k.text(78, y + 22, f"#{rank}", 13, c["accent"] if you else c["muted"], 700)
        k.player(116, y + 29, color, 0.55)
        k.text(138, y + 22, name, 14, color, 700 if you else 500, anchor="start")
        k.text(478, y + 22, value, 14, color, 700 if you else 500, anchor="end")

    # The player's own number and place.
    k.rect(560, 30, 280, 116, fill=c["panel"], stroke=c["line"], rx=14)
    k.text(584, 62, "Your rating", 13, c["muted"], anchor="start")
    k.text(584, 112, "1987", 38, c["ink"], 700, anchor="start")
    k.chip(760, 100, "▲ 15", c["ok"], 13)
    k.text(760, 132, "last match", 12, c["muted"])
    k.rect(560, 164, 280, 116, fill=c["panel"], stroke=c["line"], rx=14)
    k.text(584, 196, "Your place", 13, c["muted"], anchor="start")
    k.text(584, 246, "#5", 38, c["ink"], 700, anchor="start")
    k.text(650, 246, "of 9,830 players", 14, c["muted"], anchor="start")


def rating(k):
    c = k.c
    # Before: two players and their ratings.
    k.rect(40, 30, 300, 190, fill=c["panel"], stroke=c["line"], rx=14)
    k.text(64, 62, "Before the match", 15, weight=600, anchor="start")
    k.player(120, 160, c["accent"])
    k.chip(120, 188, "1400", c["accent"], 13)
    k.text(190, 140, "vs", 16, c["muted"], 700)
    k.player(260, 160, c["ink"])
    k.chip(260, 188, "1380", c["ink"], 13)

    k.arrow(356, 125, 402, 125)
    k.text(379, 108, "Elo", 12, c["muted"], 600)

    # After: the winner goes up, the loser goes down by the same amount.
    k.rect(418, 30, 422, 190, fill=c["panel"], stroke=c["line"], rx=14)
    k.text(442, 62, "After the match", 15, weight=600, anchor="start")
    for x, color, label, before, after, change, change_color in (
        (510, c["accent"], "Win", "1400", "1415", "▲ 15", c["ok"]),
        (720, c["ink"], "Loss", "1380", "1365", "▼ 15", c["no"]),
    ):
        k.player(x, 140, color)
        k.text(x, 160 - 66, label, 13, change_color, 700)
        k.text(x - 34, 192, before, 14, c["muted"], 500)
        k.text(x - 6, 192, "→", 14, c["muted"], 500)
        k.text(x + 28, 192, after, 15, color, 700)
        k.chip(x + 82, 186, change, change_color, 12)


def scores(k):
    c = k.c
    # The server is the only writer.
    k.rect(40, 30, 220, 210, fill=c["panel"], stroke=c["line"], rx=14)
    k.text(150, 62, "Your game's server", 14, weight=600)
    k.server(123, 84)
    k.chip(150, 200, "+12 coins", c["accent"], 12)

    k.arrow(270, 135, 336, 135, c["accent"], 2.5)
    k.text(303, 120, "records", 12, c["accent"], 700)

    # The board.
    k.rect(346, 30, 260, 210, fill=c["panel"], stroke=c["accent"], rx=14, width=2)
    k.text(476, 62, "Coins collected", 14, weight=600)
    for i, (rank, value) in enumerate((("#1", "9,410"), ("#2", "8,775"), ("#3", "8,120"), ("#4", "7,980"))):
        y = 84 + i * 36
        k.rect(362, y, 228, 30, fill=c["accent_soft"] if i == 0 else c["bg"], rx=8)
        k.text(386, y + 20, rank, 12, c["muted"], 700)
        k.player(418, y + 26, c["ink"], 0.5)
        k.line(436, y + 15, 500, y + 15, c["faint"], 6)
        k.text(578, y + 20, value, 13, c["ink"], 600, anchor="end")

    k.arrow(616, 135, 680, 135, c["muted"], 2.5)
    k.text(648, 120, "reads", 12, c["muted"], 700)

    # Players' games can only read.
    k.rect(690, 30, 150, 210, fill=c["panel"], stroke=c["line"], rx=14)
    k.text(765, 62, "Player's game", 14, weight=600)
    k.device(730, 80, 70, 116)
    k.player(765, 158, c["accent"], 0.8)
    k.text(765, 224, "read only", 12, c["muted"], 600)


if __name__ == "__main__":
    write("leaderboards", "board", board, 880, 310)
    write("leaderboards", "rating", rating, 880, 250)
    write("leaderboards", "scores", scores, 880, 270)
