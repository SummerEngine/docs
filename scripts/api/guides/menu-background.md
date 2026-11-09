---
title: "How to make an animated title screen for your game"
sidebarTitle: "An animated title screen"
description: "Make an animated title screen with AI: key art with room for the logo and menu, a short video loop with no visible seam, a menu music loop that repeats without a gap, a confirm sound, and the scene that plays it all. Exact CLI, API and MCP steps and what it costs."
icon: "monitor-play"
keywords: ["animated title screen", "main menu background", "video loop", "menu music loop", "title screen", "seamless video loop", "game main menu"]
order: 11
---

The title screen is the first thing every player sees, and they often sit on it for a minute: reading the menu, changing settings, waiting for a friend. A still picture looks unfinished. A video that jumps every five seconds looks broken. The music that stops and starts again is worse. This guide makes the four parts of a title screen that feels alive: key art composed for a logo and a menu, a short video loop from it with no visible seam, a music loop that repeats without a gap, and a confirm sound. Then it wires them into one scene.

## The chain

```recipe
{
  "steps": [
    {
      "id": "keyart",
      "title": "Key art",
      "models": ["image/gpt-image-2.5", "image/nano-banana-2.1"],
      "why": "Real light and faithful composition from a long brief, so the calm areas for the logo and the menu end up where you asked.",
      "input": {
        "prompt": "Wide painted title screen background for a cozy fantasy adventure game: a quiet forest hollow at dusk, an old mossy stump with a glowing lantern in the right third, soft fog lying low between dark tree trunks, a few fireflies, a small stream in the foreground catching the lantern light. The upper middle of the picture is calm soft sky and fog with little detail, as space for a logo. The lower left is darker and calm, as space for menu buttons. Painterly stylized look, warm orange lantern light against deep blue and green shadows, high contrast. Wide shot at eye level, no characters, no text, no logo, no letters.",
        "aspectRatio": "16:9",
        "width": 1920,
        "height": 1080,
        "title": "Title screen key art"
      }
    },
    {
      "id": "loop",
      "title": "Video loop",
      "models": ["video/luma-ray-3.2", "video/kling-3"],
      "why": "Cinematic video built for silent background loops on menus and title screens, with calm, controlled motion from one picture.",
      "input": {
        "prompt": "The camera stays locked off. Fog drifts slowly between the trunks, the lantern flame flickers gently, fireflies float and blink, the stream ripples softly. Slow, continuous, ambient motion that could loop, constant lighting, nothing enters or leaves the frame.",
        "imageUrl": "{{keyart.fileUrl}}",
        "duration": 5,
        "negativePrompt": "camera movement, zoom, people, animals, sudden movement, lighting change, fade to black, text"
      }
    },
    {
      "id": "music",
      "title": "Menu music loop",
      "models": ["music/music-v2", "music/music-v1"],
      "why": "Level and menu music in the style of your game, with instrumental loops and a steady structure, priced by the second.",
      "input": {
        "prompt": "Calm title screen music for a cozy fantasy adventure game: warm fingerpicked acoustic guitar, a soft wooden flute melody, light hand percussion, gentle low strings. 90 bpm, 4/4, steady tempo, one key throughout. Instrumental, no vocals. Made to loop: no intro build, no fade-in, no fade-out, no ending, the last bar leads straight back into the first.",
        "durationSeconds": 64
      }
    },
    {
      "id": "confirm",
      "title": "Confirm sound",
      "models": ["sound/sfx-v2", "sound/sonilo-sfx-1.1"],
      "why": "Short UI and pickup sounds from a plain description, priced by the second, so a short sound costs almost nothing.",
      "input": {
        "text": "soft magical chime with a warm airy whoosh, game menu confirm sound, bright, short, clean ending",
        "durationSeconds": 1.5
      }
    }
  ]
}
```

{{cost}}

## Before you start

Sign in once, so your agent or your terminal can run jobs on your Summer account:

```bash
npx -y summer-engine@latest login
```

Your browser opens the Summer sign-in. Pick a spend limit for this computer and choose **Allow**. Using a coding agent? Paste this guide's URL and say "make my title screen"; the [quickstart for your agent](/api/agents) connects it in one command.

Have your logo ready as a transparent PNG. The [logo and vector art](/api/guides/logo-and-vector-art) guide makes one. Then sketch the screen in one line: where the logo goes, where the menu goes, what in the scene can move.

## Step 1: key art made for a title screen

Title screen key art is not a poster. Half of it will be covered by a logo and a menu, so plan the empty spaces first.

- **Leave calm areas, and say where.** "The upper middle is calm soft sky with little detail, for a logo. The lower left is darker and calm, for menu buttons." Busy detail behind text makes both hard to read.
- **Put the light away from the menu.** The lantern sits in the right third; the menu sits in the darker lower left. White buttons read on dark, quiet ground.
- **Pick things that can move forever.** Fog, flame, fireflies, water, leaves, clouds, grass. These are the motions that loop. A character in a pose that must change, or a door, does not.
- **No text, no logo, no letters.** The logo is a separate layer, so you can change it, translate it and animate it.
- **High contrast.** Video models drift toward grey. Start with deep shadows and a bright light, and there is room to lose a little.

`width` and `height` ask for a picture at least 1920 by 1080, so it holds up full screen. Set `aspectRatio` to the screen the menu fills: `16:9` for desktop and TV. For a phone in portrait, make a second key art at `9:16`: the clip follows the shape of its picture.

{{step keyart}}

Look at it with your logo laid over it before you animate it. A key art costs {{price image/gpt-image-2.5}} and a video costs many times more, so get the picture right here. The same picture, without text, is also your store key art; the [`store-art`](/skills/store-art) skill lists every store slot.

## Step 2: a short loop with no visible seam

Send the key art's `fileUrl` as `imageUrl`: the picture becomes the first frame. {{model video/luma-ray-3.2}} is the model for this step. It is made for cinematic camera work and silent background loops for menus, at {{price video/luma-ray-3.2}}.

Video jobs on the Summer API take one picture, the first frame. There is no end-frame field, so you cannot pin the last frame to the first. You win the loop three ways instead: in the prompt, in the choice of motion, and with one short ffmpeg command after.

**In the prompt.** Ambient motion only. Words that loop: drift, flicker, float, blink, ripple, sway, pulse, glow, shimmer. Words that do not: walks, enters, opens, appears, transforms, falls. Add "the camera stays locked off", "constant lighting" and "nothing enters or leaves the frame". Put the opposite in `negativePrompt`: camera movement, zoom, people, lighting change, fade to black.

**Short is better.** Five seconds is enough. The longer a clip runs, the further it drifts from the first frame, and the harder the seam.

{{step loop}}

A video job takes a minute or more. The CLI follows it and saves the MP4; over HTTP the call answers `running`, and you read `GET /v1/jobs/{id}` until `state` is `done` ([jobs](/api/jobs)).

Play it on repeat and watch only the moment it restarts. If you see a jump, fix it with one of these. Both drop the sound track (`-an`): a title loop plays muted.

**A crossfade loop**, for fire, fog, water and particles. It blends the last second into the first, so the clip ends exactly where it begins. For a 5 second clip, `offset` is 3 (the length minus 2):

```bash
ffmpeg -i title_loop.mp4 -filter_complex "[0:v]split[a][b];[a]trim=0:1,setpts=PTS-STARTPTS[head];[b]trim=1,setpts=PTS-STARTPTS[body];[body][head]xfade=transition=fade:duration=1:offset=3[v]" -map "[v]" -an title_loop_seamless.mp4
```

**A ping-pong loop**, for a gentle camera move or a slow sway. The clip plays forward, then backward, so the end always meets the start. A very slow push-in becomes a slow breath in and out, which looks deliberate. Do not use it on fire, rain, falling leaves or flowing water: backward motion shows.

```bash
ffmpeg -i title_loop.mp4 -filter_complex "[0:v]split[f][b];[b]reverse[r];[f][r]concat=n=2:v=1:a=0[v]" -map "[v]" -an title_loop_pingpong.mp4
```

For a ping-pong loop, ask for the camera move in the prompt: "a very slow, gentle push in toward the lantern, steady and smooth", and leave camera movement out of `negativePrompt`.

**Other models for this step.** {{model video/veo3.1-lite}} makes cheap ambient loop drafts for menus and loading screens ({{price video/veo3.1-lite}}). {{model video/minimax-h3-max-turbo}} is the low-cost way to try many takes ({{price video/minimax-h3-max-turbo}}). {{model video/kling-3}} is the default video model, with fluid motion ({{price video/kling-3}}). {{model video/vidu-q4}} gives smooth, steady motion from one frame, good for idle loops. Draft three takes on a cheap model, then run the best prompt on the final one.

## Step 3: menu music that loops without a gap

A menu track loops for as long as the player sits there. Two things make it loop well: music written to loop, and a length that is a whole number of bars.

- **Ask for a loop in words.** "No intro build, no fade-in, no fade-out, no ending, the last bar leads straight back into the first."
- **Fix the tempo and the meter.** "90 bpm, 4/4, steady tempo, one key throughout." A track that speeds up or changes key cannot loop.
- **Pick the length in bars.** One bar of 4/4 is 240 divided by the tempo, in seconds. At 90 bpm a bar is 2.67 seconds, so 64 seconds is exactly 24 bars. A loop point on a bar line is a loop point the ear accepts.
- **Instrumental, calm, not too busy.** The player reads menus over it. Save the big theme for the trailer.

{{step music}}

The file is an MP3. MP3 files carry a short silence at the start from the encoder, which you hear as a tick or a gap at every loop. For a gapless loop, cut it to the bar length and convert it to Ogg Vorbis:

```bash
ffmpeg -i menu.mp3 -t 64 -c:a libvorbis -q:a 6 menu.ogg
```

Listen across the loop point three times. If the end still trails off, ask again with more weight on "no ending", or cut at an earlier bar line. Music costs {{price music/music-v2}}, so two or three takes are cheap. The [`music-track`](/skills/music-track) skill has more prompts for menu, level and boss music.

## Step 4: a confirm sound

The first sound the player makes in your game is pressing Start. Give it a short, clean sound that fits the music: soft and warm for a cozy game, a heavy hit for an action game.

{{step confirm}}

A gentle ambience bed under the music, such as night crickets and a far stream, is one more sound job with `loop: true` and about 20 seconds. The [`sound-effect`](/skills/sound-effect) skill covers UI sounds and ambience.

## Put it in your game

**Summer Engine.** Import the clip by its `assetId` or from its `fileUrl`. Summer Engine plays video as Ogg Theora (`.ogv`), and the import converts the MP4 for you: load the `.ogv` path the import answer names. If you made a seamless or ping-pong file with ffmpeg, import that file the same way.

Build the scene in layers, back to front: the key art as a `TextureRect` (it shows while the video starts), the `VideoStreamPlayer` filling the screen, the logo, then the menu. Later children draw on top.

```gdscript
extends Control

@onready var loop_player: VideoStreamPlayer = $BackgroundLoop
@onready var music: AudioStreamPlayer = $Music
@onready var confirm: AudioStreamPlayer = $ConfirmSound

func _ready() -> void:
    loop_player.stream = load("res://assets/title/title_loop.ogv")
    loop_player.expand = true
    loop_player.loop = true
    loop_player.volume_db = -80.0  # the loop plays muted; the music is its own player
    loop_player.play()

    var track: AudioStreamOggVorbis = load("res://assets/title/menu.ogg")
    track.loop = true
    music.stream = track
    music.play()

    $Menu/Play.grab_focus()

func _on_play_pressed() -> void:
    confirm.play()
    var fade := create_tween()
    fade.tween_property(music, "volume_db", -40.0, 0.6)
    await fade.finished
    get_tree().change_scene_to_file("res://levels/level_01.tscn")
```

Set the `BackgroundLoop` anchors to full rect so it fills any window. The [`animated-loop`](/skills/animated-loop) skill makes and wires the loop for you inside a project, and [`ui-graphics`](/skills/ui-graphics) makes the buttons and panels in your style.

**Any other engine.** Play the MP4 in a full-screen video player set to loop and mute, under your UI layer. On a web page, use `<video autoplay loop muted playsinline>`. Loop the Ogg music on its own audio player.

**Keep it light.** A five-second ambient loop compresses well. Export it at 720p for mobile and web builds, and keep the key art as a still fallback for low-end devices.

## Make one for every season

Once the title screen works, the chain is a template. A winter version, a Halloween version or a version per update is the same four jobs with a new key art prompt and the same loop and music prompts. Send the key arts as one batch, check them, then the loops as another:

```bash
npx -y summer-engine@latest api run --batch title-keyart.jsonl --download art/title
```

A batch takes up to 500 jobs, is priced when it arrives and runs all or none, so you know the total before anything starts ([batches](/api/jobs#run-many-jobs-batches)).

## Common problems

| You see | Do this |
|---|---|
| A jump every time the video restarts | Make a crossfade loop with the ffmpeg command, or a ping-pong loop for camera moves |
| The camera drifts and never comes back | Add "the camera stays locked off" and put camera movement in `negativePrompt` |
| Something walks in or out of frame | Ambient verbs only; add "nothing enters or leaves the frame" |
| The light changes during the clip | Add "constant lighting" and "lighting change" in `negativePrompt` |
| The clip is the wrong shape for a phone | Make a 9:16 key art; the clip follows the shape of its picture |
| The menu text is hard to read | Ask for a darker, calm area where the menu goes, and keep the light away from it |
| A tick or gap when the music loops | Cut to a whole number of bars and convert to Ogg Vorbis |
| The music fades out at the end | Add "no fade-out, no ending, the last bar leads straight back into the first" |
| The video sound plays over the music | Mute the video player, or drop the track with `-an` in ffmpeg |

## Questions

**Can I animate my own key art?** Yes. Upload it ([send a picture](/api/jobs#send-a-picture)) and start at step 2 with its `fileUrl`. Make sure it has the calm areas for the logo and menu.

**Can the loop be longer than five seconds?** Yes: you can ask for up to 20 seconds, and each model renders its nearest supported length. But a longer clip drifts further from its first frame and the seam is harder to hide. Five seconds with a crossfade looks the same to a player and costs less.

**Can I use all of it in a commercial game?** Yes. Every model on the Summer API allows commercial use of what it makes.

**Do I need a plan?** No. Jobs are paid from your paid Summer credits, your plan's credits or a top-up. Each connected agent has its own spend limit in Settings > Connected apps.
