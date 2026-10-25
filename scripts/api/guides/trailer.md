---
title: "How to make a game trailer with AI: real gameplay, a hook shot, music and store cuts"
sidebarTitle: "A game trailer"
description: "Make a game trailer with AI around your real gameplay: key art, an image-to-video hook shot, transitions, title cards, a trailer music cue, a voiceover and hits, then a 16:9 store cut and a 9:16 social cut. Structure, capture tips, exact CLI, API and MCP steps and the cost."
icon: "film"
order: 5
---

A trailer sells one promise: this is what it feels like to play. The only proof is real gameplay, so real capture is the spine of the trailer, at least half of it and usually more. AI earns its place around that spine. A hook shot that stops the scroll in the first four seconds, key art for the end card, transitions between gameplay beats, title cards for viewers with the sound off, and a music cue cut to your edit. Players who see generated "gameplay" in a trailer and then a different game in their hands do not come back. This guide makes every AI piece of a 60-second store trailer and a vertical social cut, and shows how to cut them around your capture.

## The chain

```recipe
{
  "steps": [
    {
      "id": "keyart",
      "title": "Key art",
      "models": ["image/gpt-image-2.5", "image/default"],
      "why": "Real light and a strong focal point from a long brief; this one picture becomes the hook shot, the end card and the store capsule.",
      "input": {
        "prompt": "Key art for a cozy horror adventure game: a young lantern keeper in a moss-green hooded cloak stands on a cobblestone street at night, holding a brass lantern high, its warm amber light the only light in the frame, cold blue fog rolling between dark village houses, a tall shadow far down the street. Low camera angle, the figure on the left third, open sky and fog on the right for a title. Painted storybook 3D look, soft shapes, rich but muted colours. No text, no logo.",
        "aspectRatio": "16:9",
        "title": "Lantern Hollow key art"
      }
    },
    {
      "id": "keyartvertical",
      "title": "Vertical key art",
      "models": ["image/nano-banana-2.1", "image/nano-banana-2"],
      "why": "Edits the key art into 9:16 and keeps the same character, light and colours, so the social cut starts from the same picture.",
      "input": {
        "prompt": "The same scene, character, lantern, light and colours as this picture, recomposed as a tall vertical frame: the lantern keeper in the middle third, the lantern near the top third, fog and street below her, the tall shadow small in the distance. Same painted storybook 3D look. No text, no logo.",
        "referenceImageUrl": "{{keyart.fileUrl}}",
        "aspectRatio": "9:16",
        "title": "Lantern Hollow key art, vertical"
      }
    },
    {
      "id": "hook",
      "title": "Hook shot, 16:9",
      "models": ["video/veo3.1", "video/kling-3-pro"],
      "why": "The most coherent shots with native sound, for the four seconds that decide whether anyone watches the rest.",
      "input": {
        "prompt": "The lantern keeper slowly raises her lantern and the flame flares brighter; far down the street the tall shadow takes one step forward out of the fog. Slow push-in toward her. Sound: low wind, the lantern creaking, one deep distant footstep. No speech, no music.",
        "imageUrl": "{{keyart.fileUrl}}",
        "duration": 5,
        "negativePrompt": "changing face, extra fingers, text, subtitles, logo",
        "aspectRatio": "16:9"
      }
    },
    {
      "id": "hookvertical",
      "title": "Hook shot, 9:16",
      "models": ["video/veo3.1", "video/kling-3-pro"],
      "why": "The same model as the wide hook so both cuts match; the vertical start frame gives a true 9:16 shot, not a crop.",
      "input": {
        "prompt": "The lantern keeper slowly raises her lantern and the flame flares brighter; far down the street the tall shadow takes one step forward out of the fog. Slow push-in toward her. Sound: low wind, the lantern creaking, one deep distant footstep. No speech, no music.",
        "imageUrl": "{{keyartvertical.fileUrl}}",
        "duration": 5,
        "negativePrompt": "changing face, extra fingers, text, subtitles, logo",
        "aspectRatio": "9:16"
      }
    },
    {
      "id": "transitions",
      "title": "Transition shots",
      "models": ["video/minimax-h3-max", "video/kling-3"],
      "why": "Follows a precise camera and action brief at a low price per second; a transition is only one or two seconds in the cut.",
      "count": 2,
      "input": {
        "prompt": "Extreme close-up of a brass oil lantern flame in the dark, the flame flares and fills the whole frame with warm amber light, ending on pure bright amber. Fast push-in. Painted storybook look, soft shapes.",
        "duration": 5,
        "aspectRatio": "16:9"
      }
    },
    {
      "id": "cards",
      "title": "Title cards",
      "models": ["image/ideogram-4.5", "image/gpt-image-2.5"],
      "why": "The model for words in pictures: exact titles and short lines, spelled right, in a style you describe.",
      "count": 3,
      "input": {
        "prompt": "Title card for a game trailer: the words \"THE LIGHTS WENT OUT\" in a tall hand-cut serif, warm amber letters, centred on a near-black background with a faint blue fog texture at the bottom edge. Nothing else in the frame.",
        "aspectRatio": "16:9"
      }
    },
    {
      "id": "music",
      "title": "Trailer music cue",
      "models": ["music/music-v2", "music/music-v2.5"],
      "why": "Holds a long arc with timed events, so the build, the drop and the final hit land where your edit needs them.",
      "input": {
        "prompt": "Game trailer cue at 120 BPM, D minor, 4/4, exactly 60 seconds plus a 2 second ring-out: 0:00 a lone music box melody and low wind, 0:04 a deep hit, then a soft pulse of low strings and felt piano, 0:12 hand drums enter, 0:20 full drums and cello melody, driving, 0:36 bigger with brass and taiko, 0:48 everything cuts to silence for one bar, 0:50 one huge hit and a held chord under the end card, ends at 1:00. Instrumental, no vocals.",
        "durationSeconds": 62
      }
    },
    {
      "id": "voiceover",
      "title": "Voiceover",
      "models": ["voice/expressive-v4", "voice/expressive-v3"],
      "why": "Deep, steady narration with stage words for pauses and a lower voice on the last line.",
      "input": {
        "text": "Every night, the lanterns keep the fog away. [pause] Tonight... they went out. [low, slow] Keep your light close.",
        "voiceId": "nPczCjzI2devNBz1zQrb"
      }
    },
    {
      "id": "hits",
      "title": "Trailer hits and risers",
      "models": ["sound/sfx-v2", "sound/sonilo-sfx-1.1"],
      "why": "Big cinematic hits, whooshes and risers to put on the cuts, dry so they sit with the music.",
      "count": 4,
      "input": {
        "text": "Cinematic trailer hit: one huge deep boom with a sub-bass drop and a short metallic tail, dry, no music, no voices.",
        "durationSeconds": 2
      }
    }
  ]
}
```

{{cost}}

The two hook shots are most of the cost, and they are also the two shots most people see. Draft them on a cheaper model first (below), then make the finals.

## Before you start

Sign in once, so your agent or your terminal can run jobs on your Summer account:

```bash
npx -y summer-engine@latest login
```

Your browser opens the Summer sign-in. Pick a spend limit for this computer and choose **Allow**. Using a coding agent? Paste this guide's URL and say "make the AI shots for my trailer"; the [quickstart for your agent](/api/agents) connects it in one command.

Then plan the cut before you make anything. A 60-second store trailer:

| Time | Beat | Source |
|---|---|---|
| 0:00 to 0:04 | Hook: one striking moment, readable with the sound off | AI hook shot from the key art, or your best 4 seconds of gameplay |
| 0:04 to 0:12 | Premise: what you do in this game | Gameplay, one title card |
| 0:12 to 0:36 | The core loop and its variety: places, enemies, tools | Gameplay, cut on the beat, 1.5 to 3 seconds per cut, one title card |
| 0:36 to 0:48 | Escalation: the biggest moments in the game | Gameplay, one transition shot in |
| 0:48 to 0:50 | One bar of silence | A transition shot to bright amber |
| 0:50 to 1:00 | End card: name, platform, call to action | Key art, logo card |

That is 44 seconds of real gameplay in a 60-second trailer. If your plan has less than 30, capture more before you generate more.

## Capture the gameplay first

Everything else is cut around the capture, so it comes first and gets the most care.

- **Pick the look.** The best level, time of day, camera and skins. Never the test map or the placeholder hero. Turn the HUD off unless the HUD is the point.
- **Record clean.** In Summer Engine, a desktop run in movie mode (`--write-movie shots/frame.png --fixed-fps 60`) writes every frame and a WAV at a fixed rate, so a slow computer never drops a frame. A screen recorder at 60 fps works in any engine.
- **Record big.** Capture at 1440p or higher. The vertical cut crops 16:9 to 9:16, and a crop from 1080p is too soft.
- **No game audio yet?** Send a capture of up to 20 seconds to {{model video/kling-video-to-audio}} ({{price video/kling-video-to-audio}}) as `videoUrl` with a line on what should be heard. It returns the clip with sound that follows the action, good enough for a first cut while your own sound design lands.
- **Play it ten times.** Keep the best take of each moment. A trailer is 60 seconds made from about 20 minutes of footage.

The [make content skill](/skills/make-content) has more capture and edit rules for social cuts made inside Summer Engine.

## Step 1: key art

The key art is the trailer's anchor. It opens the trailer as the hook shot, closes it as the end card, and becomes the store capsule. Make it in your game's real art style, with the hero on-model, so the AI shots and the gameplay feel like one game. Leave empty space for the title: text goes on a card, not into a picture you will animate.

{{step keyart}}

## Step 2: vertical key art

An image-to-video shot keeps the framing of its start frame. So a 9:16 hook shot needs a 9:16 start frame, not a 9:16 `aspectRatio`. Edit the key art into a tall frame with `referenceImageUrl`, and move the subject to the middle third, where phone captions do not cover it.

{{step keyartvertical}}

## Step 3: the hook shot

The hook decides if anyone watches second five. One action, one camera move, one sound you can feel. Ask for the native sound in words, and say `No speech, no music`: the music cue and the voiceover come from their own jobs.

{{step hook}}

Then the same prompt on the vertical frame:

{{step hookvertical}}

**Draft first.** Try the motion on {{model video/minimax-h3-max-turbo}} ({{price video/minimax-h3-max-turbo}}) or {{model video/veo3.1-lite}} ({{price video/veo3.1-lite}}) with the same frame and prompt. When the action reads, make the final. **Other models:** {{model video/seedance-2.5}} is strong on sweeping camera moves for a hero shot; {{model video/kling-4}} holds a character steadiest from the first frame to the last, and its notes do not list native sound, so lay the sound in the edit.

## Step 4: transition shots

A transition carries the eye from one gameplay beat to the next: a flame that fills the frame, fog that wipes across the lens, a door that slams to black. You use one or two seconds of each, so a cheap model is fine. These are text-to-video shots, so `aspectRatio` sets the framing.

{{step transitions}}

The second transition: "Thick blue fog rolls across the frame from left to right and covers everything, ending on soft solid blue-grey." Cut into gameplay on the brightest or flattest frame, where the eye has nothing to hold.

## Step 5: title cards

Many players watch store trailers and social posts muted. Three short cards carry the premise without sound: the problem, the action, the name. Seven words or fewer each.

{{step cards}}

The other two: `"KEEP YOUR LIGHT CLOSE"` in the same style, and the end card: `the game title "LANTERN HOLLOW" large in the same serif, and below it in small clean capitals "WISHLIST NOW", centred`. Keep the style sentence word for word across the three, so they read as one set. Upload your real logo instead if you have one.

## Step 6: the music cue

Write the music to your cut plan: the hit at the end of the hook, the drop when the core loop starts, the silence before the end card. At 120 BPM one bar is 2 seconds, so every event in the plan sits on a bar line.

{{step music}}

Make two or three takes and cut the gameplay to the music, not the music to the gameplay. A cut on the beat is what makes a trailer feel fast. The [cutscene music guide](/api/guides/cutscene-music) shows how to keep this cue in the same musical identity as the game's score.

## Step 7: voiceover or title cards

Use title cards when the trailer autoplays muted, a voiceover when people listen: a YouTube announcement, a launch video. You can mix both. Three lines at most, each under 12 words, spoken over gameplay, never over the hook.

{{step voiceover}}

Brian is a deep, steady narrator. The [voice lines guide](/api/guides/voice-lines) covers casting other voices and directing delivery. Lower the music by about 6 dB under each line.

## Step 8: hits and risers

Hits on the cuts are what make a trailer land. Make four: the boom at 0:04, a whoosh into the core loop, a riser into the silence, the final hit under the end card.

{{step hits}}

## Cut the trailer

Cut in any video editor: gameplay on track one, AI shots and cards on track two, then music, voice, hits and the game's own sound. Frame one must move: no logo and no black at the start. Cut on the first changed frame, and drop dead frames.

Then make the vertical cut for TikTok, Reels and Shorts: 15 to 35 seconds, the vertical hook, the two best gameplay moments, one card, no static end card (the call to action goes over the last action). Reframe each gameplay shot onto its subject, never stretched, never with a blurred copy behind it:

```bash
ffmpeg -i gameplay_1440p.mp4 -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920" -c:a copy vertical.mp4
```

Export both at the master resolution: H.264, AAC, `-movflags +faststart`. Loudness about -14 LUFS with peaks under -1 dB works on every platform.

## Common problems

| You see | Do this |
|---|---|
| The vertical hook is a crop or has bars | Make it from the vertical key art; the shot keeps its start frame's framing |
| The hook looks like a different game | Make the key art in your game's real art style, from a screenshot or concept art if you have one |
| Viewers leave in the first seconds | Put motion in frame one; move the best moment to 0:00 |
| The trailer feels slow | Cut on the beat of the music, 1.5 to 3 seconds per gameplay cut |
| Text in the animated shot is warped | Keep text on separate title cards, never in a picture you animate |
| The voiceover fights the music | Lower the music 6 dB under each line, or use title cards |
| More AI than gameplay | Capture more; at least half the trailer is real gameplay |

## Questions

**Can AI make the gameplay part too?** It should not. A trailer promises how the game plays, so gameplay comes from your game. Use AI for the hook, the art, the transitions and the sound around it.

**Which video model should make the hook?** {{model video/veo3.1}} for the most coherent shot with sound. Draft on a cheaper model, and compare two finals if the trailer matters: the [video models](/api/models#video) page lists them all.

**Can I use the trailer on store pages and ads?** Yes. Every model on the Summer API allows commercial use of what it makes.
