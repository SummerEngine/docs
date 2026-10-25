---
title: "How to make sound effects for your game with AI: a full SFX pack in one batch"
sidebarTitle: "Sound effects"
description: "Make a complete game sound effects pack with AI: UI clicks, footsteps on four materials, hits, swings, pickups and a looping ambience, as one batch. Prompts that work, lengths, loops, file names, mixing and keeping the set consistent, with exact CLI, API and MCP steps and the cost."
icon: "volume-high"
order: 2
---

One sound effect is easy. A game needs forty, and they have to sound like they come from the same world. A soft wooden menu click next to a harsh sci-fi beep feels broken. A footstep with a room echo baked in sounds wrong in every other room. Three takes of the same step are what stop a walk from sounding like a machine gun. This guide makes a whole starter pack in one batch: UI sounds, footsteps on four materials, hits, swings, pickups and a looping ambience, all dry, all the same length rules, all named so your code finds them.

## The chain

```recipe
{
  "steps": [
    {
      "id": "ui",
      "title": "UI sounds",
      "models": ["sound/sfx-v2", "sound/sonilo-sfx-1.1"],
      "why": "The default sound model: short, clean clicks with a hard start, and it follows material words such as soft wood or glass closely.",
      "count": 6,
      "input": {
        "text": "UI click: a soft wooden toggle pressed once, short dry tock with no tail, warm and muted, close-mic, dry, no reverb, no music, no voices.",
        "durationSeconds": 0.5
      }
    },
    {
      "id": "footsteps",
      "title": "Footsteps",
      "models": ["sound/sfx-v2", "sound/sonilo-sfx-1.1"],
      "why": "Names the surface and the shoe and gets both right; three runs of one prompt give three takes to rotate.",
      "count": 12,
      "input": {
        "text": "Foley one-shot: a single footstep, leather boot on dry stone tiles, firm heel strike then a light toe scuff, no tail, close-mic, dry, no reverb, no music, no voices.",
        "durationSeconds": 0.5
      }
    },
    {
      "id": "hits",
      "title": "Hits and impacts",
      "models": ["sound/sfx-v2", "sound/sonilo-sfx-1.1"],
      "why": "Strong on impacts with a clear transient and a short tail, which is what makes a hit feel heavy.",
      "count": 8,
      "input": {
        "text": "Foley one-shot: a steel sword strikes a steel shield, bright sharp metallic impact, short ringing tail that dies in half a second, close-mic, dry, no reverb, no music, no voices.",
        "durationSeconds": 1
      }
    },
    {
      "id": "swings",
      "title": "Swings and whooshes",
      "models": ["sound/stable-audio-3-sfx", "sound/sfx-v2"],
      "why": "Often the best on fast movement through air; priced per sound, so a short swing costs the same as a long one.",
      "count": 4,
      "input": {
        "text": "Foley one-shot: a heavy sword swung fast through the air, one sharp whoosh from left to right, air movement only, no metal ring, no impact, close-mic, dry, no music, no voices.",
        "durationSeconds": 1
      }
    },
    {
      "id": "pickups",
      "title": "Pickups",
      "models": ["sound/sfx-v2", "sound/sonilo-sfx-1.1"],
      "why": "Clean, bright one-shots that read through the mix, for coins, potions and keys.",
      "count": 4,
      "input": {
        "text": "Game pickup sound: a single gold coin collected, bright metallic clink with a tiny upward sparkle, short and satisfying, close-mic, dry, no reverb, no music, no voices.",
        "durationSeconds": 1
      }
    },
    {
      "id": "ambience",
      "title": "Ambience loop",
      "models": ["sound/sfx-v2", "sound/default"],
      "why": "The only sound model that makes seamless loops; generate at the longest length so the repeat is hard to hear.",
      "input": {
        "text": "Seamless loop: forest at dawn, gentle wind through leaves, distant bird calls every 6 seconds, soft creaking branches, sparse and low, no loud events at the start or end, no music, no human sound.",
        "durationSeconds": 30,
        "loop": true
      }
    }
  ]
}
```

{{cost}}

That is 35 files. Sound is the cheapest part of a game to make well, so make three takes of anything the player hears often.

## Before you start

Sign in once, so your agent or your terminal can run jobs on your Summer account:

```bash
npx -y summer-engine@latest login
```

Your browser opens the Summer sign-in. Pick a spend limit for this computer and choose **Allow**. Using a coding agent? Paste this guide's URL and say "make me this sound pack for my game"; the [quickstart for your agent](/api/agents) connects it in one command.

Write down three things before the first prompt. They keep 35 sounds from becoming 35 different games:

- **The palette.** Two or three material words for your world: "warm wood and soft cloth" for a cozy farming game, "glass and thin metal" for a sci-fi menu. Every UI and pickup prompt uses them.
- **The tail rule.** Every one-shot is dry: `close-mic, dry, no reverb`. The room comes from the engine, not the file.
- **The closing words.** `no music, no voices` at the end of every prompt, word for word. Without them a model can add a melody under a pickup or a grunt under a hit.

## Step 1: UI sounds

UI sounds play hundreds of times an hour, right next to the player's finger. They must start the instant the button goes down and stop before the next press. Ask for **0.5 seconds**, the shortest length, and describe one physical event: "a soft wooden toggle pressed once" beats "a nice menu click".

{{step ui}}

Make the six UI sounds as one family. Keep the material and only change the event:

| File | Prompt core |
|---|---|
| `ui_hover` | a fingertip brushes a soft wooden button, a barely-there tick |
| `ui_click` | a soft wooden toggle pressed once, short dry tock |
| `ui_confirm` | two quick wooden tocks rising in pitch, bright and positive |
| `ui_back` | one wooden tock falling in pitch, soft |
| `ui_error` | a dull muted double thud, low, short |
| `ui_open` | a small wooden drawer slides open, short soft slide and stop |

Hover is the quietest, confirm the brightest. If the error sound is louder than the click, the player feels punished; lower it in the mix, not by rewriting the prompt.

## Step 2: footsteps on four materials

Footsteps are the sound players hear most. One file per surface on repeat sounds mechanical within ten steps. So make **three takes of each surface** by running the same prompt three times: each run is a different performance. Name the shoe and the surface, and ask for one step only.

{{step footsteps}}

Change only the surface between the four sets: `on dry stone tiles`, `on wet grass`, `on old wooden floorboards`, `on loose gravel`. Keep the boot, the rhythm words and the closing words the same, so the character sounds like one person walking across different floors. A step is about **0.5 seconds**; ask for more and the model fills the rest with a second step or a scuff you then have to trim.

## Step 3: hits and impacts

A hit has two parts: the transient, the sharp first moment that tells the player "contact", and the tail, which tells them what was hit. Describe both, and give the tail a length: "short ringing tail that dies in half a second". One second is enough for almost every impact.

{{step hits}}

Eight hits cover a small combat game: sword on shield, sword on flesh (`a blade cuts into a thick leather sack, wet slice`), punch (`a bare fist hits a heavy leather bag, deep thud with a slap on top, no tail`), arrow into wood, a body falling on dirt, a crate breaking, a shield block, and a heavy stomp. Name materials, never feelings: `epic`, `powerful` and `cool` make the result random.

## Step 4: swings and whooshes

Movement sounds fail in one common way: you ask for a sword swing and get a clang. Say `air movement only, no metal ring, no impact`, and play the impact as its own sound at the moment of contact. That split also lets a miss sound like a miss.

{{step swings}}

{{model sound/stable-audio-3-sfx}} is often the best on fast movement and is priced per sound ({{price sound/stable-audio-3-sfx}}). It needs at least 1 second; your code plays the front of the clip. When a swing comes back with a clang anyway, run it on {{model sound/sfx-v2}} with the same words.

## Step 5: pickups

Pickups are rewards, so they should be short, bright and slightly musical: a clink, a pop, a small upward sparkle. Keep them in the same palette as the UI, because players hear both in the same second.

{{step pickups}}

Four pickups for a starter pack: coin, health potion (`a glass bottle uncorked with a short pop and a soft liquid swirl`), key (`a small iron key lifted from stone, light jingle`) and power-up (`a rising bright shimmer, half a second, ends on a clean high note`). For a level-up or victory fanfare, use a music job instead: see [music for your game](/api/guides/cutscene-music).

## Step 6: the ambience loop

Ambience is the air of a place, and it is a different job from a sound effect. It plays for minutes under everything, so it must be **boring**: sparse, distant, low, with no event that pulls attention. Ask for the longest length, **30 seconds**, and set `loop: true`. {{model sound/sfx-v2}} is the only sound model that makes seamless loops.

{{step ambience}}

Write the place, the time of day, the weather, and two or three sound sources with how often they happen: "distant bird calls every 6 seconds", not "birds". Add `no loud events at the start or end`, because a bird call right at 0:00 or 0:29 makes the loop point easy to hear. For music-like pads under a menu, use a music job; the sound model renders texture, the music model renders melody. The [ambient bed skill](/skills/ambient-bed) has prompts for twelve places, from dungeons to spaceships.

## Run the pack as one batch

Do not send 35 single runs. Put every job in one JSONL file, one line per sound, and send it as a batch: it is priced up front, runs all or none, and comes back in the order you wrote it.

```jsonl
{"model": "sound/sfx-v2", "input": {"text": "UI click: a soft wooden toggle pressed once, short dry tock with no tail, warm and muted, close-mic, dry, no reverb, no music, no voices.", "durationSeconds": 0.5}}
{"model": "sound/sfx-v2", "input": {"text": "Foley one-shot: a single footstep, leather boot on dry stone tiles, firm heel strike then a light toe scuff, no tail, close-mic, dry, no reverb, no music, no voices.", "durationSeconds": 0.5}}
{"model": "sound/sfx-v2", "input": {"text": "Foley one-shot: a single footstep, leather boot on dry stone tiles, firm heel strike then a light toe scuff, no tail, close-mic, dry, no reverb, no music, no voices.", "durationSeconds": 0.5}}
{"model": "sound/stable-audio-3-sfx", "input": {"text": "Foley one-shot: a heavy sword swung fast through the air, one sharp whoosh from left to right, air movement only, no metal ring, no impact, close-mic, dry, no music, no voices.", "durationSeconds": 1}}
{"model": "sound/sfx-v2", "input": {"text": "Seamless loop: forest at dawn, gentle wind through leaves, distant bird calls every 6 seconds, soft creaking branches, sparse and low, no loud events at the start or end, no music, no human sound.", "durationSeconds": 30, "loop": true}}
```

Keep a second file, `sfx-names.txt`, with one name per line in the same order (`ui_click`, `step_stone_01`, `step_stone_02`, `swing_sword_01`, `amb_forest_dawn_loop`). Then run the batch and rename the files:

```bash
npx -y summer-engine@latest api run --batch sfx-pack.jsonl --download audio/sfx --json > sfx-pack.json
jq -r '.batch.jobs[].result.assets[0].assetId' sfx-pack.json | paste - sfx-names.txt |
  while read id name; do mv "audio/sfx/$id.wav" "audio/sfx/$name.wav"; done
```

Through MCP, your agent sends the same lines with `summer_api_batch({ jobs: [...], out: "audio/sfx" })`. A batch takes up to 500 jobs, so a whole game's sound list fits in one ([batches](/api/jobs#run-many-jobs-batches)).

**Naming that scales:** `<group>_<thing>_<variant>`, all lowercase: `ui_click`, `step_grass_02`, `hit_sword_shield_01`, `pickup_coin`, `amb_forest_dawn_loop`. Your code can then find every take of a sound by its prefix.

## Put it in your game

- **Takes and pitch.** Never play one footstep file on repeat. In Summer Engine, put the three takes of a surface in an `AudioStreamRandomizer`, with random pitch around 0.95 to 1.05 and no repeats. Any engine has the same idea: pick a random take and nudge the pitch a few percent.
- **Mix by bus, not by file.** A starting mix: SFX at 0 dB, UI at -3 dB, ambience at -12 dB, music at -8 dB under voice. Raise a quiet file with its player's volume, up to about +9 dB, before you regenerate it.
- **Room sound.** All one-shots are dry, so add reverb per room on the bus: a small room for a hut, a long tail for a cave. The same footstep works in both.
- **Trim the front.** UI and hit files should start on the sound, not on silence. Trim any lead-in so the click lands with the press.
- **Loops.** One-shots keep loop off. For the ambience WAV in Summer Engine, set the import loop mode to Forward. If you still hear the seam, cross-fade two players over 1.5 seconds; the [ambient bed skill](/skills/ambient-bed) has the script.
- **Inside Summer Engine.** The [sound effect skill](/skills/sound-effect) makes three versions with three models, lets you pick by ear, and wires the winner to the right node and bus.

## Common problems

| You hear | Do this |
|---|---|
| A clang inside a swing | Add `air movement only, no metal ring, no impact`; play the impact as its own sound |
| Music or a melody under a pickup | End the prompt with `no music, no voices`; for a real fanfare, use a music job |
| Two footsteps in one file | Ask for `a single footstep` at 0.5 seconds |
| A hit with a room echo | Add `close-mic, dry, no reverb`; add the room with a reverb bus in the engine |
| A click or bump at the loop point | Add `no loud events at the start or end`, regenerate, or cross-fade two players |
| The UI set sounds like three games | Put the same two material words in every UI prompt |
| One sound is much louder than the rest | Lower that player's volume, or group sounds by bus and set each bus once |

## Questions

**What format do the files come in?** WAV, from every sound model. WAV loops cleanly and imports into any engine.

**Can I loop sounds from any sound model?** Seamless loops come from {{model sound/sfx-v2}} with `loop: true`. The other sound models make one-shots; for a short hum or engine loop, use {{model sound/sfx-v2}} too.

**Which model is best?** It changes from one sound to the next. {{model sound/sfx-v2}} and {{model sound/sonilo-sfx-1.1}} are strong on most sounds, {{model sound/stable-audio-3-sfx}} on fast movement, and {{model sound/mirelo-sfx-2.0}} ({{price sound/mirelo-sfx-2.0}}) is worth a test on hero sounds such as a boss roar. For a sound the player hears every second, run the same prompt on two models and pick by ear.

**Can it make grunts and screams?** Yes, as sounds: `male grunt of pain, mid-thirties, sharp, short`. For words, use a voice model: see [voice lines for game characters](/api/guides/voice-lines).

**Can I use the sounds in a commercial game?** Yes. Every model on the Summer API allows commercial use of what it makes.
