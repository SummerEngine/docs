---
title: "How to make voice lines for game characters with AI: casting, delivery, barks and dialogue"
sidebarTitle: "Voice lines"
description: "Make voice lines for game characters with AI: cast each character from the model's voice list, direct delivery with punctuation and stage words, make story lines, multi-character conversations and hundreds of combat barks, and voice other languages with the same cast. Exact CLI, API and MCP steps and the cost."
icon: "mic"
order: 6
---

Text to speech is easy. A voiced game is not. The gruff gate captain must not sound like a podcast host, and he must sound like the same man in his first line and his three-hundredth. His story lines need pauses and a crack in the voice. His combat shouts need to be short, loud, and different every time, or the fifth "Over here!" in a minute breaks the fight. This guide casts a character by ear, directs the delivery in the text itself, and makes every kind of line a game needs: a story line, a conversation between two characters, forty barks in one batch, and the same voice in another language.

## The chain

```recipe
{
  "steps": [
    {
      "id": "audition",
      "title": "Audition three voices",
      "models": ["voice/expressive-v4-turbo", "voice/flash-v2.5"],
      "why": "Fast and lower-cost, with the same voice cast as the full model, so you can hear one line in several voices before you choose.",
      "count": 3,
      "input": {
        "text": "Hold the line. They are coming through the south gate. Ready arrows!",
        "voiceId": "CwhRBWXzGAHq8TQ4Fs17"
      }
    },
    {
      "id": "story",
      "title": "Story line",
      "models": ["voice/expressive-v4", "voice/expressive-v3"],
      "why": "The most expressive voice model: reads stage words in square brackets, so the line can tire, pause and drop to a whisper.",
      "input": {
        "text": "[tired] I held that gate for twenty years. [pause] Twenty years... and not one of them came back for me. [quietly] Go. Before I change my mind.",
        "voiceId": "CwhRBWXzGAHq8TQ4Fs17"
      }
    },
    {
      "id": "conversation",
      "title": "Two-character conversation",
      "models": ["dialogue/expressive-v3", "dialogue/default"],
      "why": "Makes the whole exchange in one file with natural turn-taking and timing between the voices, which separate lines do not have.",
      "input": {
        "inputs": [
          { "text": "[whispering] Captain. The gate. It is open.", "voiceId": "cgSgspJ2msm6clMCkdW9" },
          { "text": "[sharply] Open? Who gave the order?", "voiceId": "CwhRBWXzGAHq8TQ4Fs17" },
          { "text": "Nobody. [nervous laugh] That is the problem.", "voiceId": "cgSgspJ2msm6clMCkdW9" },
          { "text": "[sigh] Get your bow. [pause] And stay behind me.", "voiceId": "CwhRBWXzGAHq8TQ4Fs17" }
        ]
      }
    },
    {
      "id": "barks",
      "title": "Combat barks",
      "models": ["voice/expressive-v4-turbo", "voice/flash-v2.5"],
      "why": "Low price per line and the same cast as the story lines, so the captain's shouts are his voice too.",
      "count": 40,
      "input": {
        "text": "Over here! NOW!",
        "voiceId": "CwhRBWXzGAHq8TQ4Fs17"
      }
    },
    {
      "id": "translated",
      "title": "The story line in German",
      "models": ["voice/multilingual-v2", "voice/expressive-v4"],
      "why": "Stable, natural speech in many languages with the same voice id, so the captain sounds like himself in German.",
      "input": {
        "text": "Zwanzig Jahre habe ich dieses Tor gehalten. Zwanzig Jahre... und keiner von ihnen kam je zurück. Geh. Bevor ich es mir anders überlege.",
        "voiceId": "CwhRBWXzGAHq8TQ4Fs17"
      }
    }
  ]
}
```

{{cost}}

Voice is priced by the character, so a short bark costs a small fraction of a story line, and a whole bark sheet costs about as much as a few long speeches.

## Before you start

Sign in once, so your agent or your terminal can run jobs on your Summer account:

```bash
npx -y summer-engine@latest login
```

Your browser opens the Summer sign-in. Pick a spend limit for this computer and choose **Allow**. Using a coding agent? Paste this guide's URL and say "voice my characters"; the [quickstart for your agent](/api/agents) connects it in one command.

Then write a **character card** for each speaking role: gender, rough age, energy, and one line about how they talk. "Captain Hodge: man in his fifties, weathered and calm, says little, never shouts unless it matters." The card decides the voice, and the voice is the most expensive thing to change later: once players have heard a character, a new voice is a new person.

## Step 1: cast from the voice list

Every voice model has its own list of voices. Print it, with the `voiceId` of each voice:

```bash
npx -y summer-engine@latest api models voice/expressive-v4
```

Through MCP: `summer_api_models({ model: "voice/expressive-v4" })`. The Expressive, Multilingual and Flash models and the dialogue model share one game cast, so a voice you cast on one works on all of them. A few, by role:

| Voice | Fits | `voiceId` |
|---|---|---|
| Roger | Captain, laid back | `CwhRBWXzGAHq8TQ4Fs17` |
| Harry | Warrior, fierce | `SOYHLrjzK2X1ezoPC6cr` |
| Brian | Narrator, deep | `nPczCjzI2devNBz1zQrb` |
| Bill | Elder, wise | `pqHfZKP75CvOlQylNhV4` |
| Adam | Villain, firm | `pNInz6obpgDQGcFmaJgB` |
| Callum | Trickster, husky | `N2lVS1w4EtoT3dr4eOWO` |
| Jessica | Heroine, playful | `cgSgspJ2msm6clMCkdW9` |
| Sarah | Mentor, reassuring | `EXAVITQu4vr4xnSDxMaL` |
| Alice | Oracle, clear | `Xb7hH8MSUJpSbSDYk0k2` |
| Bella | Healer, bright | `hpp4J3VqNfWAUOO0d1Us` |

Never guess an id: an id that is not in the list is refused. Now audition. Write one line that shows the character, and run it in three voices that fit the card: Roger, Harry and Bill for the captain.

{{step audition}}

Listen to all three back to back, in the game if you can, under the level's music. Pick by ear, then write the pick down in a cast file next to your scripts, one row per character: name, model, `voiceId`. Every later line reads its voice from that file, and two characters never share a voice.

## Step 2: story lines, directed in the text

A story line is heard once, with the player's full attention, so it gets the best model and three takes. You direct it in the text itself:

- **Full stops** make clear pauses. **Commas** make short ones.
- **An ellipsis** trails off: `Twenty years...`
- **A dash** cuts a word short: `I never meant to-`
- **Capitals** stress one word: `You SHALL not pass.` Use it once per line at most.
- **Stage words in square brackets** change the delivery on the Expressive models: `[tired]`, `[whispering]`, `[pause]`, `[laughs]`, `[sigh]`, `[shouting]`. Put each one right before the words it changes.

{{step story}}

Do not write directions in round brackets on these models: `(angrily) Get out!` is read aloud as "angrily, get out". Other models use their own marks: {{model voice/minimax-speech-2.8-hd}} reads `(laughs)` and a pause written `<#0.4#>`, and {{model voice/xai-tts-v1}} reads `[pause]` and `[sigh]`. Each model's page has samples that show its marks.

Fine-tune with `voiceSettings` when the words alone are not enough: lower `stability` for a more expressive read, higher for a steadier one, `speed` from 0.7 to 1.2. On the Expressive models, `stability` works best at 0, 0.5 or 1. Fix the text first: a new stage word changes more than any number. Names the model does not know are spelled the way they sound: `Caelthorne` becomes `KAYL-thorn`.

## Step 3: conversations with the dialogue model

When two characters talk in a linear scene (a cutscene, radio chatter, an argument the player overhears), make the whole exchange in one job. The dialogue model hears every line before it speaks, so the turn-taking and the reactions sound like people listening to each other. Each line is `{ "text", "voiceId" }`, up to 40 lines per job.

{{step conversation}}

Use separate single lines instead when the player chooses what is said next, or when your subtitle system needs one file per line. Split long scenes into chunks of about six turns: a retake then costs one chunk, not the scene.

## Step 4: barks, by the hundred

Barks are the short lines enemies and allies shout in play: "Over here!", "Reloading!", "Man down!". They are the opposite of story lines:

| | Barks | Story lines |
|---|---|---|
| Length | 1 to 6 words | Full sentences |
| Heard | Hundreds of times, under combat noise | Once, in focus |
| Takes | 3 to 5 variants per situation, played at random | One chosen take |
| Model | Fast and low-cost | The most expressive |
| Delivery | Clipped and loud: exclamation marks, one word in capitals | Acted, with stage words and pauses |

Write a bark sheet: eight situations (spotted the player, lost the player, reloading, hit, ally down, flanking, retreating, victory) times five variants is 40 lines. Vary the words, not only the take: "Over here!", "There! By the wall!", "Found him!". Carry the energy in punctuation, which every voice model reads, so the bark sheet can move to a cheaper model without a rewrite. Then send them as one batch:

{{step barks}}

```jsonl
{"model": "voice/expressive-v4-turbo", "input": {"text": "Over here! NOW!", "voiceId": "CwhRBWXzGAHq8TQ4Fs17"}}
{"model": "voice/expressive-v4-turbo", "input": {"text": "There! By the wall!", "voiceId": "CwhRBWXzGAHq8TQ4Fs17"}}
{"model": "voice/expressive-v4-turbo", "input": {"text": "Reloading! Cover me!", "voiceId": "CwhRBWXzGAHq8TQ4Fs17"}}
```

```bash
npx -y summer-engine@latest api run --batch barks.jsonl --download audio/voice/barks
```

Through MCP: `summer_api_batch({ jobs: [...], out: "audio/voice/barks" })`. A batch takes up to 500 jobs, is priced up front and runs all or none ([batches](/api/jobs#run-many-jobs-batches)).

For crowds of nameless enemies, {{model voice/inworld-tts-1.5-max}} is the lowest price here ({{price voice/inworld-tts-1.5-max}}) and has game voices of its own, such as `Dominus (en)` and `Hades (en)` for villains. Its voice ids differ from the Expressive cast, so cast those enemies from its own list.

## Step 5: other languages

Write the line in the target language, and keep the same `voiceId`. {{model voice/multilingual-v2}} speaks many languages with one voice, so the captain is still the captain in German. Translate first (a native speaker or your agent), then check the length: German and French lines often run longer, which matters for subtitles and lip timing.

{{step translated}}

Stage words in square brackets belong to the Expressive models. Leave them out of a line for {{model voice/multilingual-v2}} and carry the delivery in punctuation. For more languages: {{model voice/inworld-tts-1.5-max}} has native voices per language, such as `Johanna (de)`, `Asuka (ja)` and `Diego (es)`. {{model voice/qwen-audio-3-tts}} is strong in Chinese, Japanese and Korean. Name files by locale (`hodge_gate_01.de.mp3`) so the game picks the right one.

## Put it in your game

- **Name files by character, situation and take:** `hodge_story_gate_01.mp3`, `hodge_bark_spotted_03.mp3`. Your code finds every take of a bark by its prefix.
- **Play barks at random, never twice in a row,** and add a short cool-down per situation, so one guard does not shout "Reloading!" three times in five seconds.
- **Mix.** Voice on its own bus at full level. Lower the music about 6 dB while anyone speaks. Barks from an enemy in the world play positionally (`AudioStreamPlayer3D` in Summer Engine), with a range of about 15 m, so distant guards stay quiet.
- **Subtitles come from the same text.** Keep one script file (id, character, text, `voiceId`, file name) as the source for the batch, the subtitles and the translations.
- **Inside Summer Engine.** The [voice line skill](/skills/voice-line) casts with you, saves the cast to the project and wires each line to the right bus. For mouths that move with the line on a 3D face, see the [facial and lip-sync skill](/skills/facial-and-lipsync).

## Common problems

| You hear | Do this |
|---|---|
| A stage direction read aloud | Use square brackets on the Expressive models, or that model's own marks |
| The character sounds different from line to line | Read the `voiceId` from the cast file; never retype it |
| A flat, robotic read | Add stage words and punctuation; try `stability` 0 for one take |
| A made-up name pronounced wrong | Spell it as it sounds: `KAYL-thorn` |
| The same bark over and over | Five variants per situation, played at random with a cool-down |
| A long line drifts or loses energy | Split it at a full stop and play the parts in order |
| The conversation has awkward gaps | Make it as one dialogue job instead of single lines |

## Questions

**Can I clone my own voice or an actor's?** Not on the Summer API. Every voice comes from a model's voice list.

**How long can one line be?** Up to 5,000 characters on most voice models and 2,000 on some; each model's input lists its limit. Shorter lines give more control.

**Do I need a voice model for grunts and screams?** No: those are sounds. Make them with a sound effects job, `male grunt of pain, mid-thirties, short`. See [sound effects for your game](/api/guides/sound-effects).

**Can I ship the voices in a commercial game?** Yes. Every model on the Summer API allows commercial use of what it makes.
