---
title: "How to make 3D props and an environment kit with AI"
sidebarTitle: "Props and an environment kit"
description: "Make a style-locked 3D environment kit with AI: one style sentence, a concept sheet, a clean picture per piece, image-to-3D with a polygon budget, batches of 20 to 100 pieces, and scale and placement in the engine. Exact CLI, API and MCP steps and what it costs."
icon: "boxes"
keywords: ["ai 3d props", "environment kit", "modular kit", "image to 3d", "low poly props", "game ready 3d models", "glb"]
order: 9
---

One good 3D prop is easy now. Thirty props that look like they came from the same game is the real job. Prompt each piece on its own and you get a painterly barrel, a photo-real crate and a plastic-looking wall: six games in one level. Each piece also comes back with as many polygons as the model likes, at a size it guessed. This guide locks the style with one sentence and one concept sheet, makes a clean picture of every piece from that sheet, turns each picture into a light GLB, and sends the whole kit as batches. Then it scales and places the pieces so they snap together.

## The chain

```recipe
{
  "steps": [
    {
      "id": "sheet",
      "title": "Kit concept sheet",
      "models": ["image/gpt-image-2.5", "image/nano-banana-2.1"],
      "why": "Follows a long brief with many named pieces and keeps them separate and uncropped, so one picture sets the style of the whole kit.",
      "input": {
        "prompt": "Concept sheet for a modular game environment kit, a ruined forest shrine. Eight separate pieces in two rows with clear empty space between them, each piece whole and uncropped: a stone wall section, a square stone floor tile, a broken pillar, a stone archway, a wooden lantern post, a moss-covered stone bench, a wooden crate, a clay pot. Three-quarter view from slightly above, all pieces at the same scale. Stylized hand-painted low-poly game art, chunky readable shapes, muted greens, warm grey stone and dark wood. Pure white background, soft even light, no cast shadows, no ground plane, no text, no labels.",
        "aspectRatio": "16:9",
        "title": "Shrine kit sheet"
      }
    },
    {
      "id": "pieces",
      "title": "One picture per piece",
      "models": ["image/nano-banana-2.1", "image/nano-banana-2"],
      "why": "Edits from the concept sheet, so every piece keeps the sheet's style, and it draws one clean, centered object that image-to-3D reads well.",
      "count": 24,
      "input": {
        "prompt": "From this concept sheet, draw only the broken stone pillar, alone, whole and centered, three-quarter view from slightly above, with the same style, colours and level of detail. Stylized hand-painted low-poly game art, chunky readable shapes, muted greens, warm grey stone and dark wood. Pure white background, soft even light, no cast shadow, no ground, no other objects, no text.",
        "referenceImageUrl": "{{sheet.fileUrl}}",
        "aspectRatio": "1:1",
        "title": "Broken pillar picture"
      }
    },
    {
      "id": "models",
      "title": "3D model per piece",
      "models": ["3d/hunyuan-3d", "3d/trellis-2"],
      "why": "The default 3D model: high-quality geometry and textures from one picture, and targetPolycount keeps every piece light enough to place dozens of times.",
      "count": 24,
      "input": {
        "kind": "image-to-3d",
        "imageUrl": "{{pieces.fileUrl}}",
        "assetIntent": "object",
        "targetPolycount": 1500,
        "title": "Broken pillar"
      }
    }
  ]
}
```

{{cost}}

The chain above is a 24-piece kit. Most of the cost is the 3D step, which is why every piece is checked as a cheap picture first.

## Before you start

Sign in once, so your agent or your terminal can run jobs on your Summer account:

```bash
npx -y summer-engine@latest login
```

Your browser opens the Summer sign-in. Pick a spend limit for this computer and choose **Allow**. Using a coding agent? Paste this guide's URL and say "make me this kit"; the [quickstart for your agent](/api/agents) connects it in one command.

Then write three things down:

- **The style sentence.** One sentence, no more: "Stylized hand-painted low-poly game art, chunky readable shapes, muted greens, warm grey stone and dark wood." It goes into every prompt in this guide, word for word. When a piece does not match later, the first thing to check is whether this sentence drifted.
- **The piece list.** Every piece, one line each: "broken pillar", "stone archway", "wooden crate with iron corners". Split big things into parts the player can reuse.
- **The grid.** Pick it before anything is made: 1 m for tight dungeons and corridors, 2 m for houses and taverns, 4 m for halls and outdoor ruins. Every wall and floor piece fits the grid.

## Step 1: one concept sheet that sets the style

A concept sheet shows six to ten pieces of the kit side by side in one picture. Because one picture holds them all, they share one palette, one light and one level of detail. That picture becomes the style reference for every piece after it.

- **Name each piece**, and ask for clear empty space between them.
- **"All pieces at the same scale"** gives you a first idea of relative sizes.
- **A white background, even light, no ground plane.** The sheet is a reference, not a scene.
- **No text, no labels.** Labels end up painted into the pieces.

{{step sheet}}

Look at the sheet as the art director. Is this the game? If not, change the style sentence and run it again: a sheet costs {{price image/gpt-image-2.5}}, and every change here is cheaper than any change later. Keep the sheet's `fileUrl` once you like it.

## Step 2: a clean picture of each piece

Image-to-3D reads one object at a time. A sheet with eight pieces would become one fused lump. So edit the sheet once per piece: `referenceImageUrl` is the sheet, and the prompt names one piece and repeats the style sentence.

What image-to-3D needs from each picture:

- **One whole object, centered, nothing cropped.**
- **Three-quarter view from slightly above.** The model sees the front, one side and the top, so it guesses less.
- **White background, even light, no cast shadow, no ground.** Shadows and floors become geometry.
- **Open where it should be open.** Say "empty archway, you can see through it" or "pot with an open top". Models close holes by default.

{{step pieces}}

Run all the piece pictures, then look at them together before step 3. A picture costs {{price image/nano-banana-2.1}}; a 3D model costs far more. Remove a piece that drifted, and run its picture again.

A piece whose back is very different from its front, such as a wall with a doorway on one side, can use more than one view. Make a back view with the same edit ("the same pillar seen from behind"), then pass both pictures as `imageUrls` (two to four views of the same object) in step 3 instead of `imageUrl`.

## Step 3: a light 3D model per piece

Send each picture's `fileUrl` as `imageUrl`. Two fields matter for a kit:

- `assetIntent: "object"` treats the picture as a prop, not a character.
- `targetPolycount` sets about how many polygons the mesh gets. Without it, the model decides, and a background crate can come back heavy enough to slow the level when you place fifty of them.

{{step models}}

A 3D job takes a few minutes. The CLI follows it and saves the GLB; over HTTP the call answers `running`, and you read `GET /v1/jobs/{id}` until `state` is `done` ([jobs](/api/jobs)).

Polygon budgets that work for a kit:

| Piece | `targetPolycount` | Why |
|---|---|---|
| Walls and floor tiles | 800 to 1500 | Placed dozens of times; flat surfaces need few polygons |
| Small background props (pots, crates, sacks) | 300 to 800 | The player sees them from a distance |
| Pillars, arches, benches | 1500 to 3000 | Silhouette matters |
| Hero pieces (a shrine statue, a door) | 3000 to 8000 | Seen close, interacted with |

Keep the pieces of one kit within about twice each other's budget. A dense pillar next to a plain wall reads as "this pillar is special", when it should read as part of the set.

**Other models for this step.** {{model 3d/rodin-2.5-fast}} makes light meshes up to 20K faces for background props at a low price ({{price 3d/rodin-2.5-fast}}). {{model 3d/hunyuan-3d-rapid}} is for blockout meshes to check layout and scale before the final pieces ({{price 3d/hunyuan-3d-rapid}}). {{model 3d/tripo-p2}} builds clean quad meshes at a controlled face budget when an artist will edit them ({{price 3d/tripo-p2}}). {{model 3d/trellis-2}} is a good second opinion on thin shapes, such as a lantern post or a spear, that come back too thick. For one sculpt-level hero piece, {{model 3d/hi3d-v3}} has the finest detail.

## Make the whole kit in batches

A kit is 20 to 100 pieces. Send it as two batches: all the pictures, then, after you have checked them, all the 3D models. A batch takes up to 500 jobs, is priced when it arrives and runs all or none, so you know the total before anything starts ([batches](/api/jobs#run-many-jobs-batches)).

The picture batch is one line per piece, each with the sheet as reference and the same style sentence:

```jsonl
{"model": "image/nano-banana-2.1", "input": {"prompt": "From this concept sheet, draw only the stone archway, empty so you can see through it, alone, whole and centered, three-quarter view from slightly above, with the same style, colours and level of detail. Stylized hand-painted low-poly game art, chunky readable shapes, muted greens, warm grey stone and dark wood. Pure white background, soft even light, no cast shadow, no ground, no other objects, no text.", "referenceImageUrl": "<fileUrl of the kit concept sheet>", "title": "Stone archway picture"}}
{"model": "image/nano-banana-2.1", "input": {"prompt": "From this concept sheet, draw only the wooden crate, alone, whole and centered, three-quarter view from slightly above, with the same style, colours and level of detail. Stylized hand-painted low-poly game art, chunky readable shapes, muted greens, warm grey stone and dark wood. Pure white background, soft even light, no cast shadow, no ground, no other objects, no text.", "referenceImageUrl": "<fileUrl of the kit concept sheet>", "title": "Wooden crate picture"}}
```

```bash
npx -y summer-engine@latest api run --batch kit-pictures.jsonl --download art/kit/pictures --json > kit-pictures.json
```

The batch answers its jobs in the order you sent them, and each done job has its picture in `result.assets[0].fileUrl`. Turn them into the 3D batch, one line per picture, in the same order:

```bash
jq -c '.batch.jobs[] | select(.state == "done") | {model: "3d/hunyuan-3d", input: {kind: "image-to-3d", imageUrl: .result.assets[0].fileUrl, assetIntent: "object", targetPolycount: 1500}}' kit-pictures.json > kit-models.jsonl
npx -y summer-engine@latest api run --batch kit-models.jsonl --download art/kit/models
```

Before the second command, look at the pictures in `art/kit/pictures` and delete the line of any piece you do not want from `kit-models.jsonl`. Set a different `targetPolycount` on the lines for hero pieces and small props, and add a `title` to each line to name the asset in your library. Each account runs 10 jobs at once at the start and more as it buys credits; the rest of a batch waits its turn in order, and a waiting job is not an error.

## Put it in your game: scale and placement

Generated models are not at real-world size, and their origin is wherever the model put it. Fix both once per piece, and the kit snaps together.

- **Scale to the grid.** On a 2 m grid, a wall section is 2 m wide and about 3 m tall, a floor tile is 2 by 2 m. A crate is about 0.8 m, a door about 2 m, a bench about 0.5 m high. Measure the mesh's bounding box and scale it to the target.
- **Move the origin.** Bottom-center for props and floors, so they sit on the ground at y = 0. Bottom corner for walls, so they snap edge to edge on the grid.
- **Turn on grid snapping** at the grid size, and rotate walls in 90 degree steps.
- **Collisions.** Walls, floors and large props need a simple collision shape, a box or two, not the full mesh.

**Summer Engine.** Import each GLB by its `assetId`, or drop the files into `res://assets/kits/shrine/`. A GLB imports as a scene: instance it in the level, do not assign it as a mesh. Make one kit scene that holds one of every piece side by side on the grid, and build levels from it. For hundreds of small repeats, such as stones or grass tufts, use a `MultiMeshInstance3D`. The [`environment-kit`](/skills/environment-kit) skill stages the kit and checks scale and pivots for you; [`prop-model`](/skills/prop-model) makes a single hero prop; [`organic-model`](/skills/organic-model) makes rocks and plants that break up the straight lines.

**Any other engine.** The GLB is standard glTF 2.0, Y up. Apply the scale and origin fixes in your import settings or in a modeling tool, then save each piece as a reusable prefab or scene.

**Flat walls and floors** do not always need a 3D model. A box with a good tiling texture is lighter and snaps perfectly. The [seamless textures](/api/guides/textures) guide makes those, in a style that matches the kit if you send the concept sheet as the reference.

## Common problems

| You see | Do this |
|---|---|
| Pieces look like different games | Copy the style sentence word for word, and edit every piece picture from the same concept sheet |
| Two objects fused into one mesh | One object per picture; ask for "alone, no other objects" |
| A floor or a shadow baked into the mesh | White background, "no cast shadow, no ground" |
| The archway or the pot is closed | Say "empty archway, you can see through it", "open top" |
| A thin post or handle comes back thick | Run the same picture on {{model 3d/trellis-2}}, or ask for a thicker design |
| A heavy mesh slows the level | Lower `targetPolycount`; use 800 to 1500 for walls and floors |
| The back of a piece is a mess | Make a back view and send both as `imageUrls` |
| The piece is tiny or huge in the engine | Normal: scale it to the grid size; generated models are not at real-world size |
| Walls leave gaps on the grid | Move the origin to the bottom corner and turn on snapping |

## Questions

**Can I skip the pictures and go straight from text to 3D?** Yes: `kind: "text-to-3d"` with a `prompt` works for one-off props. For a kit, the pictures are what keep the style the same, and they let you check every piece cheaply before the 3D step.

**Can I use my own concept art?** Yes. Upload it ([send a picture](/api/jobs#send-a-picture)) and use its `fileUrl` as the reference in step 2, or as `imageUrl` in step 3 if it already shows one piece on a plain background.

**Can I use the kit in a commercial game?** Yes. Every model on the Summer API allows commercial use of what it makes.

**Do I need a plan?** No. Jobs are paid from your paid Summer credits, your plan's credits or a top-up. Each connected agent has its own spend limit in Settings > Connected apps.
