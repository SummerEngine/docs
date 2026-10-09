"""Illustrations for /build/match-results. Run: python3 scripts/illustrations/match-results.py"""

from illo import write


def flow(k):
    c = k.c
    titles = ["Outcomes", "Recorded once", "Your result", "Back to menu"]
    for i, title in enumerate(titles):
        x = 30 + i * 216
        k.rect(x, 30, 192, 200, fill=c["panel"], stroke=c["line"], rx=14)
        k.step(x + 24, 60, i + 1, title)
        if i:
            k.arrow(x - 22, 135, x - 4, 135)

    # 1. The server decides an outcome for every player.
    k.server(56, 92, 46, 72)
    for j, (label, color) in enumerate((("Win", c["ok"]), ("Loss", c["no"]), ("Abandon", c["muted"]))):
        k.chip(160, 106 + j * 34, label, color, 11)
    k.text(126, 212, "for every player", 12, c["muted"])

    # 2. Summer stores it once; a repeat is ignored.
    x = 246
    k.rect(x + 40, 88, 112, 92, fill=c["accent_soft"], rx=10)
    for j in range(3):
        k.line(x + 56, 110 + j * 20, x + 128, 110 + j * 20, c["faint"], 6)
    k.badge(x + 150, 92, ok=True, r=11)
    k.text(x + 96, 212, "same result twice? still once", 12, c["muted"])

    # 3. Each player sees only their own result.
    x = 462
    k.device(x + 61, 84, 70, 112)
    k.text(x + 96, 128, "You win!", 12, c["accent"], 700)
    k.chip(x + 96, 156, "▲ 15", c["ok"], 11)
    k.text(x + 96, 220, "only their own numbers", 12, c["muted"])

    # 4. The match closes and players are back in the menu.
    x = 678
    k.device(x + 61, 84, 70, 112)
    k.rect(x + 72, 132, 48, 24, fill=c["accent"], rx=8)
    k.text(x + 96, 148, "Play", 11, c["bg"], 700)
    k.text(x + 96, 220, "ready to play again", 12, c["muted"])


def teams(k):
    c = k.c
    rows = (
        (40, "Team 0", c["accent"], c["accent_soft"], [("Win", c["ok"], 1)] * 3),
        (140, "Team 1", c["team_b"], c["team_b_soft"], [("Loss", c["no"], 1), ("Loss", c["no"], 1), ("Abandon", c["muted"], 0.45)]),
    )
    for y, label, color, soft, players in rows:
        k.rect(40, y, 800, 84, fill=soft, stroke=color, rx=14, width=2)
        k.text(68, y + 48, label, 15, color, 700, anchor="start")
        for i, (outcome, outcome_color, opacity) in enumerate(players):
            x = 250 + i * 200
            k.player(x, y + 64, c["ink"], 0.85, opacity)
            k.chip(x + 66, y + 44, outcome, outcome_color, 12)
    k.text(716, 212, "left early", 11, c["muted"], 600)


if __name__ == "__main__":
    write("match-results", "flow", flow, 900, 260)
    write("match-results", "teams", teams, 880, 254)
