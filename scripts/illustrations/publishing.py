"""Illustrations for /publishing/*. Run: python3 scripts/illustrations/publishing.py"""

from illo import write

PAGE = "publishing"


def no_text(k, x, y):
    """A small 'No text' chip, top-left at (x, y)."""
    c = k.c
    k.rect(x, y, 62, 20, fill=c["panel"], stroke=c["no"], rx=10, width=1.5)
    k.text(x + 31, y + 14, "No text", 11, c["no"], 700)


def logo_ok(k, x, y):
    c = k.c
    k.rect(x, y, 62, 20, fill=c["panel"], stroke=c["ok"], rx=10, width=1.5)
    k.text(x + 31, y + 14, "Logo OK", 11, c["ok"], 700)


def picture(k, x, y, w, h, focus=True):
    """A placeholder picture: soft fill, a hill and a sun, and a focal point."""
    c = k.c
    k.rect(x, y, w, h, fill=c["accent_soft"], stroke=c["muted"], rx=6, width=1.5)
    k.add(
        f'<path d="M {x + 4} {y + h - 4} L {x + w * 0.35} {y + h * 0.55} L {x + w * 0.55} {y + h * 0.72} '
        f'L {x + w * 0.75} {y + h * 0.5} L {x + w - 4} {y + h - 4} z" fill="{c["accent"]}" opacity="0.45"/>'
    )
    if focus:
        k.add(f'<circle cx="{x + w / 2}" cy="{y + h * 0.45}" r="5" fill="none" stroke="{c["ink"]}" stroke-width="2"/>')
        k.add(f'<circle cx="{x + w / 2}" cy="{y + h * 0.45}" r="1.8" fill="{c["ink"]}"/>')


def journey(k):
    c = k.c
    k.text(30, 36, "Your agent", 13, c["muted"], 600, anchor="start")
    k.text(704, 36, "You", 13, c["muted"], 600, anchor="start")
    steps = [
        ("Store page", "text per store"),
        ("Art", "every slot"),
        ("Export", "one file"),
        ("Upload", "checked by Summer"),
        ("Submit", "gets a link"),
    ]
    for i, (title, note) in enumerate(steps):
        x = 30 + i * 132
        k.rect(x, 50, 118, 100, fill=c["panel"], stroke=c["line"], rx=14)
        k.add(f'<circle cx="{x + 59}" cy="80" r="13" fill="{c["accent"]}"/>')
        k.text(x + 59, 85, str(i + 1), 13, c["bg"], 700)
        k.text(x + 59, 118, title, 14, weight=600)
        k.text(x + 59, 136, note, 11, c["muted"])
        k.arrow(x + 120, 100, x + 131, 100, c["muted"], 2)
    # The owner's one click.
    k.rect(700, 50, 150, 100, fill=c["accent"], rx=14)
    k.text(775, 92, "Approve", 15, c["bg"], 700)
    k.text(775, 112, "publishing", 15, c["bg"], 700)
    # After approval.
    k.line(775, 152, 775, 160, c["muted"], 2)
    k.line(775, 160, 560, 160, c["muted"], 2)
    k.add(f'<path d="M 554 162 L 560 169 L 566 162" fill="none" stroke="{c["muted"]}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>')
    k.rect(470, 170, 180, 44, fill=c["panel"], stroke=c["line"], rx=12)
    k.text(560, 197, "Summer reviews", 13, weight=600)
    k.rect(670, 170, 180, 44, fill=c["accent_soft"], stroke=c["accent"], rx=12, width=2)
    k.text(760, 197, "Live on summer.games", 13, weight=600)
    k.arrow(652, 192, 668, 192, c["muted"], 2)
    k.text(30, 197, "Nothing reaches players before your click and Summer's review.", 12, c["muted"], anchor="start")


def servers(k):
    c = k.c
    # Agents on the left.
    agents = [("Claude Code", "on your computer"), ("Codex", "on your computer"), ("Claude, ChatGPT", "in the browser")]
    for i, (name, where) in enumerate(agents):
        y = 40 + i * 70
        k.rect(30, y, 190, 54, fill=c["panel"], stroke=c["line"], rx=12)
        k.text(46, y + 24, name, 14, weight=600, anchor="start")
        k.text(46, y + 42, where, 11, c["muted"], anchor="start")
    # Local form.
    k.rect(300, 40, 250, 124, fill=c["panel"], stroke=c["accent"], rx=14, width=2)
    k.text(425, 66, "summer-engine (npm)", 14, weight=700)
    k.text(425, 86, "the MCP on your computer", 11, c["muted"])
    k.chip(370, 120, "export", c["accent"], 11)
    k.chip(455, 120, "upload", c["accent"], 11)
    k.text(425, 152, "+ every hosted tool", 12, c["ink"], 600)
    k.arrow(222, 67, 296, 80)
    k.arrow(222, 137, 296, 120)
    # Hosted form.
    k.rect(300, 186, 250, 70, fill=c["panel"], stroke=c["team_b"], rx=14, width=2)
    k.text(425, 214, "mcp.summerengine.com", 14, weight=700)
    k.text(425, 236, "the same MCP, hosted", 11, c["muted"])
    k.arrow(222, 207, 296, 214)
    k.line(425, 166, 425, 184, c["team_b"], 2, dash="4 4")
    # What it reaches.
    k.rect(630, 40, 220, 124, fill=c["panel"], stroke=c["line"], rx=14)
    k.text(740, 66, "Summer Engine", 14, weight=600)
    k.text(740, 84, "on your disk", 11, c["muted"])
    k.rect(700, 98, 80, 50, fill=c["bg"], stroke=c["muted"], rx=6, width=2)
    for j in range(3):
        k.rect(735, 104 + j * 13, 10, 6, fill=c["accent"], rx=1)
    k.arrow(552, 100, 626, 100)
    k.rect(630, 186, 220, 70, fill=c["panel"], stroke=c["line"], rx=14)
    k.text(740, 214, "Summer Games store", 14, weight=600)
    k.text(740, 236, "page, art, builds, submit", 11, c["muted"])
    k.arrow(552, 221, 626, 221)


def builds(k):
    c = k.c
    cols = [
        ("Store bundle", "summer.bundle.v1 .zip", ["iPhone", "Android", "Mac app *", "Windows app *"], "Summer Games apps", c["accent"]),
        ("Web build", ".zip with index.html", ["summer.games"], "in the browser", c["team_b"]),
        ("Download", ".app or .exe, zipped", ["Mac", "Windows"], "players download it", c["muted"]),
    ]
    for i, (title, note, targets, where, color) in enumerate(cols):
        x = 30 + i * 280
        k.rect(x, 30, 260, 210, fill=c["panel"], stroke=color, rx=14, width=2)
        k.rect(x + 20, 50, 40, 50, fill=c["bg"], stroke=c["muted"], rx=6, width=2)
        for j in range(4):
            k.rect(x + 36, 55 + j * 10, 8, 5, fill=color, rx=1)
        k.text(x + 76, 70, title, 15, weight=700, anchor="start")
        k.text(x + 76, 90, note, 11, c["muted"], anchor="start")
        for j, target in enumerate(targets):
            k.badge(x + 30, 130 + j * 22, ok=True, r=7)
            k.text(x + 44, 134 + j * 22, target, 12, anchor="start")
        k.text(x + 130, 228, where, 12, c["muted"])
    k.text(30, 262, "* Mac and Windows apps: multiplayer games only. Single-player games use a download there.", 11, c["muted"], anchor="start")


def slots_desktop(k):
    c = k.c
    k.text(30, 34, "Desktop store: summer.games and the desktop app", 15, weight=700, anchor="start")
    # Key art 16:9.
    picture(k, 30, 56, 256, 144)
    no_text(k, 38, 64)
    k.text(158, 222, "Key art 16:9", 13, weight=600)
    k.text(158, 240, "1920×1080, no logo", 11, c["muted"])
    # Tall capsule 3:4.
    picture(k, 310, 56, 108, 144)
    logo_ok(k, 318, 64)
    k.rect(321, 70 + 14, 86, 115, fill="none", stroke=c["ok"], rx=4, dash="4 4", width=1.2)
    k.text(364, 222, "Tall capsule 3:4", 13, weight=600)
    k.text(364, 240, "600×800, optional", 11, c["muted"])
    # Wide capsule 460:215.
    picture(k, 442, 56, 196, 92)
    logo_ok(k, 450, 64)
    k.text(540, 170, "Wide capsule", 13, weight=600)
    k.text(540, 188, "460:215, 920×430, optional", 11, c["muted"])
    # Icon 1:1.
    k.rect(662, 56, 72, 72, fill=c["accent_soft"], stroke=c["muted"], rx=14, width=1.5)
    k.add(f'<circle cx="698" cy="92" r="18" fill="{c["accent"]}"/>')
    k.text(698, 150, "Icon 1:1", 13, weight=600)
    k.text(698, 168, "1024×1024", 11, c["muted"])
    k.text(698, 184, "no words", 11, c["muted"])
    # Screenshots.
    for j in range(3):
        picture(k, 758 + j * 8, 56 + j * 8, 80, 45, focus=False)
    k.text(806, 150, "Screenshots", 13, weight=600)
    k.text(806, 168, "16:9, 4-8", 11, c["muted"])
    k.text(806, 184, "real play", 11, c["muted"])
    k.text(30, 268, "Missing capsules are cropped from the key art around its focal point (the ring).", 11, c["muted"], anchor="start")


def slots_mobile(k):
    c = k.c
    k.text(30, 34, "Mobile store: the iPhone and Android apps. No text in any picture.", 15, weight=700, anchor="start")
    # Tall cover 9:16 with safe area and title zone.
    x, y, w, h = 30, 56, 135, 240
    picture(k, x, y, w, h)
    k.rect(x, y + h * 2 / 3, w, h / 3, fill="#000000", rx=0, opacity=0.22)
    k.text(x + w / 2, y + h - 26, "the app draws", 11, c["ink"], 600)
    k.text(x + w / 2, y + h - 11, "the title here", 11, c["ink"], 600)
    sw = w * 0.92
    sh = sw * 5 / 4
    k.rect(x + (w - sw) / 2, y + (h - sh) / 2, sw, sh, fill="none", stroke=c["ok"], rx=4, dash="4 4", width=1.5)
    no_text(k, x + 8, y + 8)
    k.text(x + w / 2, 318, "Tall cover 9:16", 13, weight=600)
    k.text(x + w / 2, 336, "1080×1920; subject in the 4:5", 11, c["muted"])
    # Key art 16:9 with shade.
    picture(k, 200, 56, 256, 144)
    k.rect(200, 150, 256, 50, fill="#000000", rx=0, opacity=0.22)
    no_text(k, 208, 64)
    k.text(328, 222, "Key art 16:9", 13, weight=600)
    k.text(328, 240, "1920×1080, under a shade and the title", 11, c["muted"])
    # Icon.
    k.rect(490, 56, 72, 72, fill=c["accent_soft"], stroke=c["muted"], rx=16, width=1.5)
    k.add(f'<circle cx="526" cy="92" r="18" fill="{c["accent"]}"/>')
    k.text(526, 150, "Icon 1:1", 13, weight=600)
    k.text(526, 168, "1024×1024, 40-112 pt", 11, c["muted"])
    # Screenshots in play orientation.
    for j in range(3):
        k.device(600 + j * 82, 56, 66, 116)
    k.text(723, 196, "Screenshots", 13, weight=600)
    k.text(723, 214, "3-8, in the way the game is played", 11, c["muted"])
    k.text(200, 318, "One page holds at most 20 pictures and videos across both stores.", 12, c["muted"], anchor="start")


def crop(k):
    c = k.c
    steps = ["Generate", "Crop to the slot", "Upload", "Into the slot"]
    for i, title in enumerate(steps):
        k.step(30 + i * 215, 34, i + 1, title)
    # 1: a wide generated picture.
    picture(k, 30, 60, 180, 102)
    k.text(120, 184, "summer_generate_image", 11, c["muted"])
    k.arrow(214, 111, 240, 111)
    # 2: the crop frame around the focal point.
    picture(k, 245, 60, 180, 102)
    fw = 102 * 9 / 16
    k.rect(245 + 90 - fw / 2, 60, fw, 102, fill="none", stroke=c["accent"], rx=2, width=3)
    k.text(335, 184, "9:16 around the focus", 11, c["muted"])
    k.arrow(429, 111, 455, 111)
    # 3: upload to My assets.
    k.rect(470, 60, 170, 102, fill=c["panel"], stroke=c["line"], rx=12)
    k.add(
        f'<path d="M 555 128 V 82 M 540 97 L 555 82 L 570 97" fill="none" stroke="{c["accent"]}" '
        f'stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>'
    )
    k.line(530, 140, 580, 140, c["muted"], 3)
    k.text(555, 184, "summer_upload_image_*", 11, c["muted"])
    k.arrow(644, 111, 670, 111)
    # 4: the slot.
    picture(k, 715, 56, 62, 110)
    k.badge(790, 70, ok=True)
    k.text(760, 184, "summer_store_set_art", 11, c["muted"])


def text_flows(k):
    c = k.c
    for x, title, limit in ((30, "Desktop store", "Description 120-300"), (520, "Mobile store", "Description 120-170")):
        k.rect(x, 30, 330, 180, fill=c["panel"], stroke=c["line"], rx=14)
        k.text(x + 20, 60, title, 15, weight=700, anchor="start")
        k.text(x + 20, 90, "Tagline (80)", 12, c["muted"], anchor="start")
        k.line(x + 20, 104, x + 290, 104, c["faint"], 6)
        k.text(x + 20, 134, limit, 12, c["muted"], anchor="start")
        k.line(x + 20, 148, x + 300, 148, c["faint"], 6)
        k.line(x + 20, 162, x + (300 if x == 30 else 220), 162, c["faint"], 6)
        k.line(x + 20, 176, x + (250 if x == 30 else 120), 176, c["faint"], 6)
    k.arrow(366, 120, 514, 120, c["accent"], 3)
    k.rect(380, 132, 120, 28, fill=c["accent"], rx=14)
    k.text(440, 151, "Same as desktop", 12, c["bg"], 700)
    k.text(440, 182, "copies once", 11, c["muted"])
    k.text(30, 238, "Title and 3-8 tags are shared. Art never copies between stores.", 12, c["muted"], anchor="start")


def upload(k):
    c = k.c
    # The file in parts.
    k.rect(30, 40, 150, 150, fill=c["panel"], stroke=c["line"], rx=14)
    k.text(105, 66, "Your export", 13, weight=600)
    for j in range(4):
        k.rect(55, 82 + j * 22, 100, 16, fill=c["accent"] if j < 3 else c["accent_soft"], rx=4, opacity=0.85)
    k.text(105, 180, "64 MiB parts, resumable", 11, c["muted"])
    k.arrow(184, 115, 224, 115)
    # Checks.
    k.rect(230, 40, 180, 150, fill=c["panel"], stroke=c["line"], rx=14)
    k.text(320, 66, "Summer checks", 13, weight=600)
    for j, label in enumerate(("iPhone", "Android", "Mac", "Windows")):
        k.badge(260, 92 + j * 22, ok=True, r=7)
        k.text(274, 96 + j * 22, label, 12, anchor="start")
    k.arrow(414, 115, 454, 115)
    # Submit.
    k.rect(460, 40, 170, 150, fill=c["panel"], stroke=c["line"], rx=14)
    k.text(545, 66, "Submit", 13, weight=600)
    k.text(545, 98, "page + build", 12, c["muted"])
    k.text(545, 118, "+ proposed price", 12, c["muted"])
    k.chip(545, 158, "nothing published", c["muted"], 11)
    k.arrow(634, 115, 674, 115)
    # Link.
    k.rect(680, 40, 170, 150, fill=c["accent_soft"], stroke=c["accent"], rx=14, width=2)
    k.text(765, 66, "Approval link", 13, weight=600)
    k.add(
        f'<path d="M 748 112 a 12 12 0 0 1 0 -17 l 8 -8 a 12 12 0 0 1 17 17 l -4 4 M 782 104 a 12 12 0 0 1 0 17 '
        f'l -8 8 a 12 12 0 0 1 -17 -17 l 4 -4" fill="none" stroke="{c["accent"]}" stroke-width="3" stroke-linecap="round"/>'
    )
    k.text(765, 160, "for the owner", 12, c["muted"])


def approval(k):
    c = k.c
    k.rect(30, 50, 160, 90, fill=c["panel"], stroke=c["line"], rx=14)
    k.text(110, 84, "Agent submits", 14, weight=600)
    k.text(110, 106, "summer_store_submit", 11, c["muted"])
    k.arrow(194, 95, 234, 95)
    k.rect(240, 50, 180, 90, fill=c["panel"], stroke=c["accent"], rx=14, width=2)
    k.text(330, 82, "Awaiting you", 14, weight=600)
    k.text(330, 104, "page, art, build, price", 11, c["muted"])
    k.text(330, 122, "exactly as submitted", 11, c["muted"])
    k.arrow(424, 95, 464, 95, c["accent"])
    k.rect(470, 50, 170, 90, fill=c["accent"], rx=14)
    k.text(555, 90, "Approve", 15, c["bg"], 700)
    k.text(555, 110, "publishing", 15, c["bg"], 700)
    k.arrow(644, 95, 684, 95)
    k.rect(690, 50, 160, 90, fill=c["accent_soft"], stroke=c["accent"], rx=14, width=2)
    k.text(770, 84, "Summer reviews", 14, weight=600)
    k.text(770, 106, "then it goes live", 11, c["muted"])
    # Side branches.
    k.line(330, 142, 330, 176, c["muted"], 2, dash="4 4")
    k.rect(240, 180, 180, 50, fill=c["panel"], stroke=c["line"], rx=12)
    k.text(330, 202, "Not now", 13, weight=600)
    k.text(330, 220, "Cancelled: nothing published", 11, c["muted"])
    k.rect(470, 180, 170, 50, fill=c["panel"], stroke=c["no"], rx=12, dash="5 5")
    k.text(555, 202, "Page changed", 13, c["no"], 600)
    k.text(555, 220, "Stale: submit again", 11, c["muted"])
    k.line(410, 142, 520, 178, c["no"], 2, dash="4 4")


def analytics(k):
    c = k.c
    k.rect(30, 40, 230, 80, fill=c["panel"], stroke=c["accent"], rx=14, width=2)
    k.text(145, 72, "Your game's events", 14, weight=600)
    k.text(145, 94, "level_completed, …", 12, c["muted"])
    k.rect(30, 140, 230, 80, fill=c["panel"], stroke=c["team_b"], rx=14, width=2)
    k.text(145, 172, "Counted by Summer", 14, weight=600)
    k.text(145, 194, "page views, launches, play time", 11, c["muted"])
    k.arrow(264, 80, 340, 120)
    k.arrow(264, 180, 340, 140)
    k.rect(350, 40, 500, 180, fill=c["panel"], stroke=c["line"], rx=14)
    k.text(370, 68, "Grow → Analytics", 15, weight=700, anchor="start")
    for i, (label, value) in enumerate((("Page views", "1,204"), ("Launches", "388"), ("Play time", "61 h"))):
        x = 370 + i * 156
        k.rect(x, 84, 144, 56, fill=c["bg"], stroke=c["line"], rx=10)
        k.text(x + 12, 104, label, 11, c["muted"], anchor="start")
        k.text(x + 12, 128, value, 17, weight=700, anchor="start")
    heights = [18, 26, 22, 34, 30, 44, 40, 52, 46, 58, 54, 62]
    for i, hgt in enumerate(heights):
        k.rect(372 + i * 38, 206 - hgt, 24, hgt, fill=c["accent"], rx=3, opacity=0.8)


def cost(k):
    c = k.c
    options = [
        ("Free", "Publish free.", "Players can tip you.", "Any engine"),
        ("30%", "Set a price.", "Summer takes 30% of each sale.", "Any engine"),
        ("Sparks", "Join the Summer economy.", "Sell in-game items for Sparks.", "Built in Summer only"),
    ]
    for i, (figure, title, text, fit) in enumerate(options):
        x = 30 + i * 280
        k.rect(x, 30, 260, 170, fill=c["panel"], stroke=c["accent"] if i == 0 else c["line"], rx=14, width=2 if i == 0 else 1.5)
        k.text(x + 24, 80, figure, 30, c["accent"], 700, anchor="start")
        k.text(x + 24, 116, title, 14, weight=600, anchor="start")
        k.text(x + 24, 138, text, 12, c["muted"], anchor="start")
        k.chip(x + 24 + (14 + len(fit) * 11 * 0.58) / 2, 172, fit, c["team_b"] if i == 2 else c["muted"], 11)


if __name__ == "__main__":
    write(PAGE, "journey", journey, 880, 230)
    write(PAGE, "servers", servers, 880, 280)
    write(PAGE, "builds", builds, 880, 280)
    write(PAGE, "slots-desktop", slots_desktop, 880, 285)
    write(PAGE, "slots-mobile", slots_mobile, 880, 350)
    write(PAGE, "crop", crop, 880, 200)
    write(PAGE, "text", text_flows, 880, 255)
    write(PAGE, "upload", upload, 880, 220)
    write(PAGE, "approval", approval, 880, 250)
    write(PAGE, "analytics", analytics, 880, 250)
    write(PAGE, "cost", cost, 880, 230)
