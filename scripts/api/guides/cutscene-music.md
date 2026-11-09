---
title: "How to make music for your game's cutscenes with AI: timed cues, a menu loop and a combat theme"
sidebarTitle: "Cutscene music"
description: "Make game music with AI that sounds like one score: a cutscene cue timed to the scene's length, a menu loop and a combat theme that share one musical identity, plus a victory sting. Tempo and bar math, prompts that work, loop points and mixing, with exact CLI, API and MCP steps and the cost."
icon: "music"
order: 3
---

Game music has two jobs that pull against each other. A cutscene cue must fit a scene to the second: swell when the castle appears, land a hit on the cut, end when the picture ends. A menu loop or a combat theme must play for ten minutes without the player hearing the seam. And all of it should sound like one composer wrote it, so the menu, the intro and the boss fight feel like the same game. A music model does not remember your last track. This guide gives it the same identity in words every time, does the tempo math so cues fit their scenes, and makes four cues in one batch.

## The chain

```recipe
{
  "steps": [
    {
      "id": "menu",
      "title": "Menu loop (the theme)",
      "models": ["music/music-v2", "music/music-v2.5"],
      "why": "The default music model: follows tempo, key and named instruments closely and holds a long structure, so the theme comes out as written.",
      "input": {
        "prompt": "Lantern Hollow theme: D minor, 4/4, solo cello carries a slow rising melody, felt piano, warm low strings, soft hand frame drum. Menu loop at 75 BPM: calm and wistful, sparse, the cello melody enters at bar 3, even dynamics, no big build, ends on the same D minor chord it starts on so it can loop. Instrumental, no vocals.",
        "durationSeconds": 60
      }
    },
    {
      "id": "intro",
      "title": "Intro cutscene cue",
      "models": ["music/music-v2", "music/music-v2.5"],
      "why": "Holds a linear arc with timed events, so the swell and the hit land close to the second you ask for. Three takes give you one that fits.",
      "count": 3,
      "input": {
        "prompt": "Lantern Hollow theme: D minor, 4/4, solo cello carries a slow rising melody, felt piano, warm low strings, soft hand frame drum. Linear cutscene cue at 75 BPM, exactly 32 seconds plus a 2 second ring-out: opens on solo felt piano, the cello melody enters at 0:06, low strings swell from 0:10, full strings and a deep drum hit land together at 0:16, then the arrangement thins, ends on a held D minor chord at 0:32 that rings out. Instrumental, no vocals.",
        "durationSeconds": 34
      }
    },
    {
      "id": "combat",
      "title": "Combat loop",
      "models": ["music/music-v2", "music/music-v2.5"],
      "why": "Handles full drums and fast ostinatos at a fixed tempo, which a combat loop needs to stay locked to the beat.",
      "input": {
        "prompt": "Lantern Hollow theme: D minor, 4/4, solo cello carries a slow rising melody, felt piano, warm low strings, soft hand frame drum. Combat loop at 150 BPM in D dorian: urgent and driving, the same cello melody now bowed hard and fast over taiko drums on 1 and 3, low brass ostinato, string tremolo, no melodic resolution, steady energy from start to end so it can loop. Instrumental, no vocals.",
        "durationSeconds": 64
      }
    },
    {
      "id": "sting",
      "title": "Victory sting",
      "models": ["music/music-v2", "music/music-v2.5"],
      "why": "Short cues are billed by the second, so a six-second sting from the same theme costs almost nothing.",
      "input": {
        "prompt": "Lantern Hollow theme: D minor, 4/4, solo cello carries a slow rising melody, felt piano, warm low strings, soft hand frame drum. Victory sting, 6 seconds: the cello plays the first rising phrase of the melody, resolves up to a bright D major chord with a soft cymbal swell, then rings out. Instrumental, no vocals.",
        "durationSeconds": 6
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

Your browser opens the Summer sign-in. Pick a spend limit for this computer and choose **Allow**. Using a coding agent? Paste this guide's URL and say "score my game like this"; the [quickstart for your agent](/api/agents) connects it in one command.

Then write the **identity sentence**. It is one line that names the key, the time signature, the lead instrument and the two or three instruments around it:

> Lantern Hollow theme: D minor, 4/4, solo cello carries a slow rising melody, felt piano, warm low strings, soft hand frame drum.

Every cue starts with this sentence, word for word. The model takes no melody and no reference track, so this sentence is how it knows the cues belong together. Change the tempo, the density and the mood per cue. Never change the key centre or the lead instrument.

## Step 1: the menu loop, where the theme lives

Make the menu loop first. It is the cue players hear most, and it is your reference: if it does not sound like your game, fix the identity sentence before you spend anything on the other cues.

{{step menu}}

What makes a prompt work, in order:

- **One tempo number.** `75 BPM`, not `70 to 80 BPM`. A range comes back drifting between the two.
- **A mode, not only a key.** `D minor` for calm, `D dorian` for combat: the same root, a different colour.
- **Two to four named instruments.** `solo cello` beats `strings`; `felt piano` beats `keys`.
- **Mood tied to motion.** `calm and wistful, sparse`, `urgent and driving`. Not `epic` or `chill`.
- **How it ends.** For a loop, `ends on the same chord it starts on`. For a cue, the timeline.

Do not name a film, a game or a composer. The model will not copy them, and the words take the place of ingredients that would have worked.

## Step 2: a cutscene cue timed to the scene

A cue has a known length, so do the math before you write the prompt. At 75 BPM in 4/4, one beat is 0.8 seconds and one bar is 3.2 seconds. A 32-second intro is exactly 10 bars. Put every event on a bar line: 0:16 is the start of bar 6, which is where the castle reveal cuts in. Events on bar lines land where you ask far more often than events in the middle of a bar.

| Tempo | One bar of 4/4 | Bars in 32 s |
|---|---|---|
| 60 BPM | 4.0 s | 8 |
| 75 BPM | 3.2 s | 10 |
| 120 BPM | 2.0 s | 16 |
| 150 BPM | 1.6 s | 20 |

Set `durationSeconds` to the scene length plus a 2-second ring-out, so the last chord fades under the cut to gameplay instead of stopping dead. Write the arc with timestamps: what opens, what enters, where the hit is, how it ends.

{{step intro}}

Make **three takes**. The model follows a timeline closely but not to the frame, so pick the take whose hit lands nearest 0:16. Then **cut the picture to the music**: moving a cut three frames is invisible; stretching music is not. The [cutscene guide](/api/guides/cutscenes) builds the scene these cues score.

## Step 3: the combat loop from the same theme

The combat loop is the theme under pressure. Keep the identity sentence and change four things: double the tempo (75 to 150 BPM, so the pulse still feels related), move to the dorian mode on the same root, add drums and an ostinato, and remove resolution so the tension never settles.

{{step combat}}

Make loops at least 45 to 60 seconds. A 20-second loop is recognised as a repeat within two minutes of play. 64 seconds at 150 BPM is exactly 40 bars, so the loop point sits on a bar line. To switch between exploration and combat without a jump, make both loops at related tempos in the same key: the [adaptive music skill](/skills/adaptive-music) wires the crossfade to your game state.

## Step 4: a sting for the win

A sting marks a moment: victory, level up, a secret found. Quote the first phrase of the theme and resolve it, in 4 to 8 seconds. Because it uses the identity sentence, it sounds like the end of your combat music, not a sound from a library.

{{step sting}}

## Run all cues as one batch

The cues do not depend on each other, so send them together once the menu loop sounds right. One JSONL line per job, in the order you want them back:

```bash
npx -y summer-engine@latest api run --batch score.jsonl --download audio/music
```

Through MCP: `summer_api_batch({ jobs: [...], out: "audio/music" })`. A batch is priced before it starts and runs all or none ([batches](/api/jobs#run-many-jobs-batches)). For a bigger score, add one line per cue: a cue for each cutscene, a boss loop with its own named instrument (a boss theme is not just louder combat music), an ending cue up to a few minutes long. `durationSeconds` goes up to 600.

**Other models for this job.** {{model music/music-v2.5}} is the newest version of the default, at the same price ({{price music/music-v2.5}}): run your menu prompt on it and compare by ear before you switch the whole score. {{model music/music-v1}} is good at tracks with a planned structure, such as a calm intro that builds into a boss theme.

## Put it in your game

- **Loop points.** Generated music does not end on a clean loop. In Summer Engine, select the MP3 and turn on `loop` in the Import dock; set `loop_offset` to skip an intro on later passes, for example 3.2 seconds to skip the first bar. In any engine, trim the file on a bar line (a multiple of 3.2 seconds at 75 BPM) or cross-fade two players over one second. The [music track skill](/skills/music-track) has the cross-fade script.
- **Cutscene cues.** Start the cue on the same frame as the picture. For an in-engine cutscene, put the cue on an audio track of the cutscene's animation, so a skipped or paused scene stays in sync. Fade the menu or level music out over about one second before the cue starts.
- **Mix.** Music sits behind effects and voice: about -8 dB on a Music bus, dropping another 6 dB while a character speaks. Never at full volume on the master bus.
- **Keep the prompts.** Save every prompt next to its file. The next cue starts from the same identity sentence, and a new composer, or a new agent, can extend the score months later.

## Common problems

| You hear | Do this |
|---|---|
| Generic stock music | Add one tempo number, a mode, and two to four named instruments |
| The combat loop sounds like another game | Start it with the same identity sentence as the menu loop, word for word |
| The swell lands late or early | Put events on bar lines, make three takes, and move the cut a few frames to the music |
| Singing you did not ask for | End the prompt with `Instrumental, no vocals` |
| A jump at the loop point | Ask for `ends on the same chord it starts on`, trim on a bar line, or cross-fade two players |
| The music cuts off when the scene ends | Add a 2-second ring-out to `durationSeconds` and let it fade under the cut |
| The sting sounds like a different score | Quote the theme: name the lead instrument and its first phrase |

## Questions

**Can I give the model a melody or a reference track?** No. Music models on the Summer API take a text prompt and a length. The identity sentence carries the melody's instrument, key and shape; keep it identical across cues.

**How long can a cue be?** From 3 to 600 seconds. You pay per second of music, so a 6-second sting costs a tenth of a 60-second loop.

**Can I make songs with lyrics?** Yes, {{model music/music-v2}} sings when the prompt asks for vocals and gives the words. For a trailer song that is often the hook; for in-game loops, keep the music instrumental so it sits under voice and effects.

**Can I use the music in a commercial game and its trailer?** Yes. Every model on the Summer API allows commercial use of what it makes.
