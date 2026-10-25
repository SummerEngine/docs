---
title: "How to make a 3D game character with AI: concept, model, rig and animations"
sidebarTitle: "A 3D character"
description: "Make a rigged, animated 3D game character with AI: a clean concept picture, image-to-3D with a rig and Idle, Walk, Run and Jump on the same job, and a matching portrait for your dialogue UI. Exact CLI, API and MCP steps and what it costs."
icon: "person-standing"
order: 1
---

A playable character needs more than a pretty mesh. It needs one clean silhouette, a neutral pose a skeleton can fit, a rig, and the handful of motions the player sees every second: standing, walking, running, jumping. This guide makes all of that in two jobs, plus a portrait for dialogue, and you get a GLB that drops into Summer Engine or any engine that reads glTF.

## The chain

```recipe
{
  "steps": [
    {
      "id": "concept",
      "title": "Concept picture",
      "models": ["image/gpt-image-2.5", "image/default"],
      "why": "Follows a long character brief closely and keeps the full body in frame on a plain background, which is what image-to-3D reads best.",
      "input": {
        "prompt": "Clean single-character concept for image-to-3D: MIRA, a young adult sky-pirate mechanic, copper-red braided bob, brass goggles on her forehead, cropped teal flight jacket, leather tool belt, olive cargo trousers, tall brown boots. Full body, front view, neutral A-pose with the arms slightly away from the body, whole figure in frame with space around it. Pure white seamless background, soft even light, no cast shadow, no props. Stylized 3D animated feature look, clean readable shapes. No text, no logos.",
        "aspectRatio": "3:4",
        "title": "Mira concept"
      }
    },
    {
      "id": "model",
      "title": "Rigged, animated 3D model",
      "models": ["3d/default"],
      "why": "The default 3D model: a textured GLB from one picture, and with rig it fits a humanoid skeleton and bakes the motions you name on the same job.",
      "input": {
        "kind": "image-to-3d",
        "imageUrl": "{{concept.fileUrl}}",
        "assetIntent": "character",
        "poseMode": "a-pose",
        "rig": true,
        "animationNames": ["Idle", "Walk", "Run", "Jump"],
        "title": "Mira"
      }
    },
    {
      "id": "portrait",
      "title": "Dialogue portrait",
      "models": ["image/nano-banana-2", "image/default"],
      "why": "Edits from the concept picture, so the face, hair and colours stay the same character, at a fraction of the cost of a new drawing.",
      "input": {
        "prompt": "Head-and-shoulders portrait of this same character for a dialogue box, three-quarter view, confident half smile, same hair, goggles and jacket, soft rim light, plain warm grey background.",
        "referenceImageUrl": "{{concept.fileUrl}}",
        "aspectRatio": "1:1",
        "title": "Mira portrait"
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

Your browser opens the Summer sign-in. Pick a spend limit for this computer and choose **Allow**. Using a coding agent? Paste this guide's URL and say "make me this character"; the [quickstart for your agent](/api/agents) connects it in one command.

## Step 1: a concept picture image-to-3D can read

Image-to-3D rebuilds what it can see. Every hidden arm, cropped boot or busy background becomes a guess in the mesh. So the concept picture is not key art: it is a reference sheet with one job.

- **One character, full body, nothing cropped.** Leave space around the figure.
- **A neutral A-pose.** Arms slightly away from the body, legs straight. The rig fits far better than to an action pose, and the arms do not fuse to the hips.
- **A plain white background, even light, no cast shadow.** Shadows read as geometry.
- **Name the materials and colours.** "Leather tool belt", "brass goggles": the texture follows the words.

{{step concept}}

The job comes back done in the same call. Its `result.assets[0].fileUrl` is the picture you feed to step 2. Not right yet? Change one thing at a time in the prompt and run it again: a concept picture costs {{price image/gpt-image-2.5}}, so iterate here, where it is cheap, and not on the 3D job.

## Step 2: the 3D model, rigged and animated in one job

Send the concept's `fileUrl` as `imageUrl`. Three fields turn a statue into a character:

- `assetIntent: "character"` prepares the picture as a clean, riggable humanoid reference first.
- `rig: true` fits a humanoid skeleton to the mesh.
- `animationNames` bakes motions onto that skeleton on the same job: `Idle`, `Walk`, `Run` and `Jump` cover a third-person controller.

{{step model}}

A 3D job takes a few minutes. The CLI follows it and saves the GLB; over HTTP the call answers `running`, and you read `GET /v1/jobs/{id}` until `state` is `done` ([jobs](/api/jobs)). The GLB holds the mesh, its textures, the skeleton and every animation clip by name.

**Other models for this step.** {{model 3d/meshy-7.1}} gives a cleaner quad topology when an artist will keep editing the mesh ({{price 3d/meshy-7.1}}, rigging included at a lower add-on). {{model 3d/rodin-2.5-fast}} is the cheapest way to block out a cast of background characters ({{price 3d/rodin-2.5-fast}}). For a hero you will look at for hours, compare two models on the same concept picture before you commit: the [3D models](/api/models#3d-models) page lists them all with examples.

## Step 3: a portrait that is the same person

Dialogue boxes, party menus and save slots want a face, not a full body. Edit the concept picture instead of drawing a new one: `referenceImageUrl` keeps the character on-model.

{{step portrait}}

## Put it in your game

- **Summer Engine.** Import the GLB by its `assetId`, or drop the file in your project. The `character-model` and `character-animation-wiring` skills wire the clips into an AnimationTree and a controller for you.
- **Any other engine.** The GLB is standard glTF 2.0, Y up. Scale it to about 1.7 m tall for a human: generated models are not at real-world size.
- **Keep the ids.** Every file is also in your Summer library. Note the `assetId` of the concept and the model, so the next variant starts from the same picture.

## Make the whole cast

Once one character works, the recipe is the template. Write the next prompts with the same style sentence word for word ("Stylized 3D animated feature look, clean readable shapes"), and send the concept pictures as one batch, then the 3D jobs as another:

```bash
npx -y summer-engine@latest api run --batch cast-concepts.jsonl --download art/concepts
```

A batch is priced up front and runs all or none, so you know the cost of the whole cast before anything starts ([batches](/api/jobs)).

## Common problems

| You see | Do this |
|---|---|
| Arms fused to the body | Ask for an A-pose with "arms slightly away from the body", and keep a white background |
| A blurry or melted face | Make the face larger in the concept: a 3:4 picture with less empty space above the head |
| Feet sink into the floor in the engine | Move the root so the feet sit on y = 0; the rig keeps its origin at the pelvis |
| Colours look different in 3D | Name them in the prompt ("teal jacket", "copper-red hair"), not only in the picture |
| Walk cycle slides on the ground | Drive the clip speed from the character's velocity in your controller |

## Questions

**Can I make a character from a drawing I already have?** Yes. Upload it first ([upload a file](/api/jobs)), then start at step 2 with its `fileUrl`. A clean, full-body, front-view drawing works best.

**Can I use the character in a commercial game?** Yes. Every model on the Summer API allows commercial use of what it makes.

**Do I need a plan?** No. Jobs are paid from your paid Summer credits, your plan's credits or a top-up. Each connected agent has its own spend limit in Settings > Connected apps.
