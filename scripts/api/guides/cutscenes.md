---
title: "How to make cutscenes for your game with AI: on-model shots, a voice line and a music cue"
sidebarTitle: "Cutscenes"
description: "Make a game cutscene with AI that keeps your character on-model: a character reference picture, a style frame, image-to-video shots with native sound, a voice line, a music cue and sound accents, then assemble the shots. Exact CLI, API and MCP steps and what it costs."
icon: "clapperboard"
order: 4
---

The hard part of an AI cutscene is not making a good shot. It is making three shots in a row where the hero has the same face, the same cloak and the same light, so the player believes it is one moment. Ask a video model for each shot from words alone and you get three different people. Ask for one long take and the face drifts after six seconds. The fix is the method film crews use: lock the look in still pictures first, then animate each picture as its own short shot, then cut them together with a voice line and a music cue. This guide makes a 15-second story beat that way, from nothing to a finished MP4.

## The chain

```recipe
{
  "steps": [
    {
      "id": "character",
      "title": "Character reference picture",
      "models": ["image/gpt-image-2.5", "image/default"],
      "why": "Follows a long character brief closely and keeps the whole figure on a plain background: the one picture every later frame is edited from.",
      "input": {
        "prompt": "Character reference picture: WREN, the lantern keeper, a young woman in her twenties, freckled face, short dark auburn hair, moss-green hooded wool cloak over a cream linen tunic, brown leather satchel, holding a brass oil lantern with a warm amber flame. Full body, front view, standing straight, whole figure in frame. Plain light grey background, soft even light. Painted storybook 3D look, soft shapes, rich but muted colours. No text.",
        "aspectRatio": "3:4",
        "title": "Wren reference"
      }
    },
    {
      "id": "styleframe",
      "title": "Style frame (shot 1)",
      "models": ["image/gpt-image-2.5", "image/default"],
      "why": "Faithful edits: puts the same character into the scene and sets the light and palette that every other shot copies.",
      "input": {
        "prompt": "Wide cinematic film still of this same character, Wren, standing at the edge of a misty village at dusk, holding her brass lantern up, cobblestone street behind her with dark unlit lanterns on posts, cold blue fog, her lantern the only warm light. Same face, hair, cloak and lantern as the reference. Painted storybook 3D look, soft shapes, rich but muted colours. 16:9, room around her, no text.",
        "referenceImageUrl": "{{character.fileUrl}}",
        "aspectRatio": "16:9",
        "title": "Wren intro, style frame"
      }
    },
    {
      "id": "frames",
      "title": "Start frames, later shots",
      "models": ["image/nano-banana-2.1", "image/nano-banana-2"],
      "why": "Keeps the same look across many images when it edits from one picture, at a low price per frame.",
      "count": 2,
      "input": {
        "prompt": "Medium close-up of the same woman from this picture, Wren, three-quarter view, her face lit from below by the amber lantern, worried eyes looking past the camera into the fog. Same face, hair, cloak, lantern, light and colours as this picture. 16:9 film still, no text.",
        "referenceImageUrl": "{{styleframe.fileUrl}}",
        "aspectRatio": "16:9",
        "title": "Wren intro, shot 2 frame"
      }
    },
    {
      "id": "shots",
      "title": "Image-to-video shots",
      "models": ["video/kling-3-pro", "video/kling-3"],
      "why": "Fluid motion that holds a character from its start frame, with native sound made with the picture.",
      "count": 3,
      "input": {
        "prompt": "She slowly raises the brass lantern and looks down the empty street, fog drifting past her, the lantern flame flickering. Slow push-in. Ambient sound only: soft wind, a lantern creaking on its handle, distant water. No speech, no music.",
        "imageUrl": "{{styleframe.fileUrl}}",
        "duration": 5,
        "negativePrompt": "changing face, extra fingers, warped hands, text, subtitles",
        "aspectRatio": "16:9"
      }
    },
    {
      "id": "voice",
      "title": "Voice line",
      "models": ["voice/expressive-v4", "voice/expressive-v3"],
      "why": "Reads stage words in square brackets, so one line can drop to a whisper on the word that matters.",
      "input": {
        "text": "[quietly] The lanterns went out at midnight. [pause] All of them. [whispering] Whatever came through the fog... it is still here.",
        "voiceId": "Xb7hH8MSUJpSbSDYk0k2"
      }
    },
    {
      "id": "music",
      "title": "Music cue",
      "models": ["music/music-v2", "music/music-v2.5"],
      "why": "Follows a timed arc and named instruments, so the cue fits the scene's length and swells on the last shot.",
      "input": {
        "prompt": "Linear cutscene cue at 60 BPM, D minor, 4/4, exactly 15 seconds plus a 2 second ring-out: a low cello drone and sparse felt piano notes, uneasy and quiet, a soft string swell starts at 0:08 and peaks at 0:12, ends on an unresolved held chord. Instrumental, no vocals, no drums.",
        "durationSeconds": 17
      }
    },
    {
      "id": "accents",
      "title": "Sound accents",
      "models": ["sound/sfx-v2", "sound/sonilo-sfx-1.1"],
      "why": "Adds the one or two sounds the shots must have exactly on the cut, which native sound does not place for you.",
      "count": 2,
      "input": {
        "text": "A brass oil lantern flame flares up brightly with a soft whoosh and a crackle, close, dry, no music, no voices.",
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

Your browser opens the Summer sign-in. Pick a spend limit for this computer and choose **Allow**. Using a coding agent? Paste this guide's URL and say "make this cutscene for my game"; the [quickstart for your agent](/api/agents) connects it in one command.

Then write the **shot list**. A cutscene longer than about 6 seconds is several shots, never one take. One line per shot: framing, the one action, the one camera move.

| Shot | Framing | Action | Camera |
|---|---|---|---|
| 1 | Wide | Wren raises her lantern at the edge of the dark village | Slow push-in |
| 2 | Medium close-up | Her face in lantern light, she turns toward the fog | Static |
| 3 | Over the shoulder | Something moves in the fog at the end of the street | Slow push past her shoulder |

Three 5-second shots make a 15-second beat. A still costs a small part of what a shot costs, so do all the fixing on stills.

## Step 1: a character reference picture

This picture is the character's identity for the whole cutscene. Every later frame is an edit of it or of a picture made from it. Make it like a casting photo: the full figure, front view, plain background, even light, and every detail named in words ("moss-green hooded wool cloak", "brass oil lantern"). Words carry colours and materials into the edits better than pixels alone.

{{step character}}

If the character is already in your game, start from a screenshot or the concept art instead: [upload the file](/api/jobs#send-a-picture) and use its `fileUrl` in step 2. The 3D [character guide](/api/guides/3d-character) makes a concept picture that works here as it is.

## Step 2: the style frame

The style frame is shot 1's first frame, and it sets the look of the whole scene: the light, the palette, the lens. Edit it from the character reference with `referenceImageUrl`, and say "same face, hair, cloak and lantern as the reference".

{{step styleframe}}

Make it 16:9, or 9:16 for a phone game. An image-to-video shot keeps the framing of its start frame, so a square start frame gives you a square shot whatever `aspectRatio` says. Look at the style frame for a full minute before you go on. A wrong colour here is wrong in every shot.

## Step 3: start frames for the other shots

Make each later shot's first frame as an edit of the **style frame**, not of the character reference. The style frame already holds the character and the light, so both carry into the close-up and the over-the-shoulder shot.

{{step frames}}

Run the step once per shot, with that shot's framing and action from your list. The second frame, for shot 3, is: "Over-the-shoulder shot from behind the same woman, Wren, her raised lantern in the foreground, looking down the foggy street where a tall shadow stands between the dark lanterns." Keep the closing sentence ("same face, hair, cloak, lantern, light and colours as this picture") in every frame prompt, word for word.

## Step 4: animate each shot

Now each start frame becomes a 5-second shot. The prompt describes only what moves: one action and one camera move. The picture already says what everything looks like, so do not describe the character again; repeated description makes the model redraw her.

{{step shots}}

Run it three times, once per start frame, and change the prompt to that shot's action. What works:

- **One verb for the camera.** `Slow push-in`, `static`, `slow pan left`. Complex moves through a crowd fall apart.
- **5 seconds.** Faces, hands and physics drift with every second past about six. Two 5-second shots look better than one 10-second shot and cost the same.
- **Say what the sound is.** {{model video/kling-3-pro}} makes sound with the picture. Ask for it: `ambient sound only: soft wind, a lantern creaking`. Add `no speech, no music`, because the voice and the music come from their own jobs.
- **A negative prompt for the usual faults.** `changing face, extra fingers, warped hands, text, subtitles`.

A video job takes a few minutes. The CLI follows it and saves the MP4; over HTTP you read `GET /v1/jobs/{id}` until `state` is `done` ([jobs](/api/jobs)). Try a new shot first on a cheap model such as {{model video/minimax-h3-max-turbo}} ({{price video/minimax-h3-max-turbo}}) to check the motion, then make the final.

**Other models for this step.** {{model video/kling-4}} ({{price video/kling-4}}) holds a character steadiest from the first frame to the last; its notes do not list native sound, so plan the sound as the separate jobs in steps 5 to 7. {{model video/veo3.1}} gives the most coherent shots, with native sound, for the one shot that must be perfect ({{price video/veo3.1}}). {{model video/happy-horse-1.1}} makes the character speak with lip sync when you write the line into the video prompt: the voice then comes from the video model, not from your voice cast.

## Step 5: the voice line

The line is its own job, so you choose the voice, the delivery and the timing. Pick the voice from the model's list (`npx -y summer-engine@latest api models voice/expressive-v4` prints every `voiceId`). Alice, a clear and calm voice, fits a lantern keeper who has seen something.

{{step voice}}

Stage words in square brackets set the delivery: `[quietly]`, `[pause]`, `[whispering]`. Full stops make clear pauses, and an ellipsis trails off. A video model does not move lips to a separate voice file. So play the line over shots where the mouth is small or hidden: the wide shot and the over-the-shoulder shot here. The [voice lines guide](/api/guides/voice-lines) covers casting and delivery in depth.

## Step 6: the music cue

Time the cue to the scene: 15 seconds of picture plus a 2-second ring-out, so the last chord fades under the cut back to gameplay. At 60 BPM one bar is 4 seconds, so events on bar lines (0:08, 0:12) land where you ask more often. The swell starts under shot 2 and peaks inside shot 3.

{{step music}}

Make two or three takes and keep the one whose peak lands nearest 0:12. Then move the cut a few frames to the music, not the music to the cut. For a score that shares one theme across the menu, the cutscenes and combat, see [music for your game's cutscenes](/api/guides/cutscene-music).

## Step 7: sound accents on the cut

Native sound gives you the air of each shot. It does not put a sound on an exact frame. For the one or two moments that must hit (the lantern flaring on the cut to shot 3, a distant bell), make them as sound effects and place them yourself.

{{step accents}}

If you used a video model without native sound, make the ambience here too: one `loop: true` sound per location, at the length of the scene. There is no model on the Summer API today that adds sound to a finished video. Sound effects and music are always separate jobs that you place in the edit.

## Assemble the shots

Cut on action: end shot 1 as she starts to turn, open shot 2 mid-turn. Then lay the sound in four layers: native sound low, the voice on top, the music under it, the accents on their frames. In any video editor that is four tracks. From a shell, two commands do it:

```bash
printf "file 'shot_01.mp4'\nfile 'shot_02.mp4'\nfile 'shot_03.mp4'\n" > shots.txt
ffmpeg -f concat -safe 0 -i shots.txt -c:v libx264 -c:a aac picture.mp4

ffmpeg -i picture.mp4 -i wren_line.mp3 -i cue.mp3 -filter_complex \
  "[0:a]volume=0.35[amb];[1:a]adelay=2000|2000[vo];[2:a]volume=0.5[mus];[amb][vo][mus]amix=inputs=3:duration=first:normalize=0[a]" \
  -map 0:v -map "[a]" -c:v copy -c:a aac cutscene.mp4
```

The voice starts 2 seconds in (`adelay=2000`), the shots' own sound sits at 35 percent and the music at half volume under the voice. The concat step needs every shot to have a sound track; with a silent video model, drop `[0:a]` and mix your ambience loop in its place. Add the accents the same way, each with its own `adelay`.

## Put it in your game

- **Summer Engine.** Import the MP4 by its `assetId` or URL; the import converts it to `.ogv`, the video format the engine plays, and names the new file. Play it in a full-screen `VideoStreamPlayer` with a short fade from and to black. The [cinematic cutscene skill](/skills/cinematic-cutscene) builds the scene, the fade and the hand-back to gameplay for you.
- **Any other engine.** The MP4 plays in any video player node. Pause gameplay, fade in, play, fade out, and let the player skip.
- **Keep the stills.** The character reference and the style frame are now the canon for this character. The next cutscene edits from them, so Wren looks the same in chapter five.

## Make every cutscene in the game

Once the first scene works, the next one is a batch. Write every start frame for the scene into one JSONL file and send it with `summer api run --batch frames.jsonl --download cutscenes/ch2`. Review the stills, then send the shots as a second batch, each with its frame's `fileUrl` as `imageUrl`. A batch is priced up front and runs all or none ([batches](/api/jobs#run-many-jobs-batches)).

## Common problems

| You see | Do this |
|---|---|
| The character's face changes between shots | Edit every start frame from the style frame, keep the "same face" sentence, and keep shots at 5 seconds |
| The shot comes out square or vertical | Make the start frame in the framing you want; an image-to-video shot keeps it |
| The character talks gibberish in the native sound | Add `No speech` to the video prompt |
| Lips do not match the voice line | Play the line over wide or back-facing shots, or use {{model video/happy-horse-1.1}} with the line in the prompt |
| Hands melt or the lantern changes shape | Add them to `negativePrompt` and make the action smaller |
| The camera move falls apart | Use one simple move per shot: push-in, pan or static |
| The cutscene feels silent | Add the native sound back at a low level and an ambience loop under it |

## Questions

**Can I make a cutscene from my own game's art?** Yes. Upload a screenshot or the concept art ([send a picture](/api/jobs#send-a-picture)) and start at step 2 with its `fileUrl`.

**How long can one shot be?** `duration` goes up to 20 seconds, and each model renders its nearest supported length. For a character on screen, 5 seconds per shot holds the look best.

**Can the video model add sound to a video I already have?** No. There is no video-to-audio model on the Summer API today. Make the ambience, effects and music as separate jobs.

**Can I use the cutscene in a commercial game?** Yes. Every model on the Summer API allows commercial use of what it makes.
