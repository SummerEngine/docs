---
title: "How to make seamless textures for your game with AI"
sidebarTitle: "Seamless textures"
description: "Make tileable ground, wall and material textures for your game with AI: one anchor texture, a matching set from it, a seam check you can trust, a free normal map, and tiling in the engine. Exact CLI, API and MCP steps and what it costs."
icon: "grid-2x2"
keywords: ["seamless texture", "tileable texture", "ai texture generator", "game textures", "ground texture", "wall texture", "normal map"]
order: 8
---

A texture that looks great as one square can look terrible on a floor. Repeat it twenty times and every flaw repeats with it: a hard line where the edges meet, a dark corner from baked-in light, one bright pebble that turns into a grid of bright pebbles. Image models also love perspective and drama, which is the opposite of what a tile needs. This guide makes one anchor texture with the prompt words that keep it flat and even, builds a matching set from it, checks the seam the way a texture artist does, adds a normal map for free, and tiles it at the right scale in the engine.

## The chain

```recipe
{
  "steps": [
    {
      "id": "anchor",
      "title": "Anchor texture",
      "models": ["image/nano-banana-2.1", "image/nano-banana-2"],
      "why": "Sharp and faithful to a long prompt, and on Nano Banana models the same seed repeats a look, so the anchor is easy to come back to.",
      "input": {
        "prompt": "Forest floor ground texture: packed dark soil, small pebbles, fallen pine needles and short moss spread evenly across the whole square. Seamless tileable texture, straight top-down view, flat even overcast light, no perspective, no cast shadows, no vignette, no single standout feature, filled edge to edge. Stylized hand-painted game texture, soft painterly detail, muted greens and warm browns.",
        "aspectRatio": "1:1",
        "seed": 4127,
        "title": "Forest floor"
      }
    },
    {
      "id": "set",
      "title": "Matching textures",
      "models": ["image/nano-banana-2.1", "image/nano-banana-2"],
      "why": "Edits from the anchor picture, so the brush work, palette and light carry into every new material.",
      "count": 5,
      "input": {
        "prompt": "A new texture in exactly the same style, palette, light and level of detail as this picture: a mossy stone brick wall, rows of rounded grey stones with thin dark mortar lines, moss in a few cracks, spread evenly. Seamless tileable texture, straight front view, flat even overcast light, no perspective, no cast shadows, no vignette, no single standout feature, filled edge to edge.",
        "referenceImageUrl": "{{anchor.fileUrl}}",
        "aspectRatio": "1:1",
        "seed": 4127,
        "title": "Mossy stone wall"
      }
    }
  ]
}
```

{{cost}}

The normal maps cost nothing: the free [normal map generator](https://www.summerengine.com/create/normal-map-generator) makes them in your browser.

## Before you start

Sign in once, so your agent or your terminal can run jobs on your Summer account:

```bash
npx -y summer-engine@latest login
```

Your browser opens the Summer sign-in. Pick a spend limit for this computer and choose **Allow**. Using a coding agent? Paste this guide's URL and say "make me a forest texture set"; the [quickstart for your agent](/api/agents) connects it in one command.

Decide two things first:

- **The list of surfaces.** Ground, wall, path, wood, roof, rock: one line each, with the material and how worn it is.
- **The style sentence.** One sentence for the look, such as "Stylized hand-painted game texture, soft painterly detail, muted greens and warm browns". It goes into every prompt, word for word.

## Step 1: one anchor texture, flat and even

The anchor is the texture that sets the look for the whole set. Pick the surface the player sees most, usually the ground.

Every word in the prompt has a job:

- **"Seamless tileable texture"** tells the model the picture will repeat.
- **"Straight top-down view"** (or "straight front view" for walls) removes perspective. A floor that shrinks toward a horizon can never tile.
- **"Flat even overcast light, no cast shadows, no vignette"** removes baked light. A shadow in one corner becomes a stripe of shadows across the whole floor.
- **"No single standout feature"** stops the model from adding one hero rock, one flower or one crack. Those are the details the eye catches when they repeat.
- **"Spread evenly" and "filled edge to edge"** keep detail all the way to the borders, where the seam is.

Keep `aspectRatio` at `1:1`: tiles are square. Set a `seed` and write it down. On Nano Banana models the same seed and prompt give a similar picture, so you can make small prompt changes without losing the look.

{{step anchor}}

Not right? Change one phrase at a time. A texture costs {{price image/nano-banana-2.1}}, so make five anchors and pick the best one before you build the set on it.

**Other models for this step.** {{model image/flux-3}} is strong on photoreal and painterly surfaces ({{price image/flux-3}}). {{model image/grok-imagine}} makes fast surface ideas at a low price per picture ({{price image/grok-imagine}}), good for trying ten materials before you commit to a style. {{model image/flux-3-klein}} is the cheapest way to draft ({{price image/flux-3-klein}}). Only Nano Banana models repeat a look from a seed; on the others, the reference picture in step 2 does that work.

## Step 2: the matching set, from the anchor

Separate prompts give separate games: a painterly floor next to a photo-like wall. Instead, send the anchor as `referenceImageUrl` on every other texture. The model copies the brush work, palette, light and level of detail from the picture, and the prompt changes only the material.

Start the prompt with "A new texture in exactly the same style, palette, light and level of detail as this picture", then name the new surface. Keep the same seed and the same seamless words.

{{step set}}

For each surface, change only the middle of the prompt:

| Surface | The words to change |
|---|---|
| Path | worn cobblestones of mixed sizes, packed dirt between them |
| Wood | weathered horizontal oak planks, soft grain, a few nail heads spread evenly |
| Roof | overlapping clay roof tiles in even rows, a little moss |
| Rock | rough grey cliff rock, cracks running in many directions |
| Sand | dry sand with small ripples and scattered tiny shells |

Bricks, planks and tiles are patterns with rows. Tell the model the rows run straight and evenly across the picture, or the last row gets cut in half at the edge.

## Check the seam before you use it

Never trust a texture from one square. Two quick checks find every seam.

**Tile it.** Repeat the texture three by three and look at the big picture from a distance. With ImageMagick:

```bash
magick -size 3072x3072 tile:forest_floor.png forest_floor_tiled.png
```

Look for straight lines at the edges, a grid of the same bright spot, or a light and dark checker pattern. A checker means the light was not even. A grid of spots means a standout feature.

**Roll it.** Move the texture by half its size, so the four edges meet in the middle, where you can see them:

```bash
magick forest_floor.png -roll +512+512 forest_floor_rolled.png
```

A good tile shows nothing in the middle. A bad tile shows a cross.

**Fix a small seam.** Paint over the cross in the rolled picture with a healing brush in any image editor, then roll it back by the same amount. The edges now match by construction, because the new edges are pixels that already sat next to each other. For a large seam, run the anchor again with more weight on "seamless tileable, filled edge to edge, no single standout feature". Fixing a picture by hand takes five minutes; it is often faster than five more takes.

Inside a Summer Engine project, the [`tileable-texture`](/skills/tileable-texture) skill makes the texture, checks it tiled and wires it onto a floor or a wall for you.

## Normal maps, for free

The models make the colour texture (the albedo) only. Light on a flat colour texture looks flat. A normal map adds the bumps: the gaps between stones catch shadow, planks get an edge, and the whole surface reacts to your lights.

Open the free [normal map generator](https://www.summerengine.com/create/normal-map-generator), drop your texture in, and download the normal map. It runs in your browser. Then:

- **Keep the strength low for stylized art.** Painted textures already have light painted in. A strong normal map on top looks noisy.
- **Check the direction.** Summer Engine reads normal maps with green pointing up. If the bumps look dented, as if light came from below, invert the green channel.
- **Make one per texture.** A normal map follows its own texture, so the set of six textures needs six normal maps.

The tiling holds: a normal map made from a seamless texture tiles too.

## Put it in your game

**Summer Engine.** Drop the PNG files into your project. In the import dock, keep mipmaps on and use VRAM compressed for textures you use in 3D; mipmaps stop the shimmer on a floor seen from far away. Then make a `StandardMaterial3D` and set its scale to the size of the surface:

```gdscript
var mat := StandardMaterial3D.new()
mat.albedo_texture = load("res://art/textures/forest_floor.png")
mat.normal_enabled = true
mat.normal_texture = load("res://art/textures/forest_floor_normal.png")
mat.uv1_scale = Vector3(20, 20, 1)  # a 20 m floor, one tile per metre
$Floor.material_override = mat
```

The scale is the whole trick. A tile of forest floor should cover about one to two metres; a brick wall tile about one metre wide. On a 20 m plane, `uv1_scale` of 20 gives one tile per metre. Leave it at 1 and one picture stretches across the whole floor and looks blurry.

Two more settings that help:

- **Triplanar mapping** (`mat.uv1_triplanar = true`) projects the texture from three sides. Use it on rocks, cliffs and generated meshes whose UVs stretch.
- **Break the repeat.** Make three versions of the ground from the same anchor and seed (`numImages: 3`), and paint them across the level, or add a second texture at a different scale on the material's detail layer. The eye stops seeing the grid.

**Any other engine.** The PNG tiles in any engine. Set the texture's wrap mode to repeat, turn on mipmaps, and set the material's tiling to the surface size in metres.

**Pixel-art games.** Use the [`pixel-art`](/skills/pixel-art) skill's prompt pattern instead, with a named palette and "no anti-aliasing", and set the texture filter to nearest.

## Make a whole biome

A biome is ten to twenty textures: two or three grounds, walls, paths, a cliff, wood, a roof, details. Write one JSONL file, one job per line, every line with the anchor's `fileUrl` as `referenceImageUrl`, the same seed and the same style words:

```jsonl
{"model": "image/nano-banana-2.1", "input": {"prompt": "A new texture in exactly the same style, palette, light and level of detail as this picture: worn cobblestones of mixed sizes, packed dirt between them. Seamless tileable texture, straight top-down view, flat even overcast light, no perspective, no cast shadows, no single standout feature, filled edge to edge.", "referenceImageUrl": "<fileUrl of the anchor>", "seed": 4127, "title": "Cobble path"}}
{"model": "image/nano-banana-2.1", "input": {"prompt": "A new texture in exactly the same style, palette, light and level of detail as this picture: weathered horizontal oak planks in straight even rows, soft grain. Seamless tileable texture, straight front view, flat even overcast light, no perspective, no cast shadows, no single standout feature, filled edge to edge.", "referenceImageUrl": "<fileUrl of the anchor>", "seed": 4127, "title": "Oak planks"}}
```

```bash
npx -y summer-engine@latest api run --batch biome.jsonl --download art/textures
```

A batch takes up to 500 jobs, is priced when it arrives and runs all or none, so you know the total first ([batches](/api/jobs#run-many-jobs-batches)). A sky to go with it is a separate job: the [`skybox-panorama`](/skills/skybox-panorama) skill covers it.

## Common problems

| You see | Do this |
|---|---|
| A hard line at the edges | Roll the texture by half and heal the cross, or run it again with "filled edge to edge" |
| A light and dark checker when tiled | Baked light. Add "flat even overcast light, no cast shadows, no vignette" |
| The same rock repeats in a grid | Add "no single standout feature, spread evenly". Make three versions and mix them |
| The floor shrinks toward a horizon | Add "straight top-down view, no perspective" |
| Bricks cut in half at the border | Say "straight even rows across the whole picture" |
| The new texture does not match the set | Send the anchor as `referenceImageUrl`, start the prompt with "in exactly the same style", keep the seed |
| Blurry or stretched on the floor | Raise the material's UV scale to the surface size in metres; keep mipmaps on |
| Bumps look dented | Invert the green channel of the normal map |

## Questions

**Can I get a full PBR set, with roughness and height?** The models make the colour texture. The [normal map generator](https://www.summerengine.com/create/normal-map-generator) adds the normal map. For most stylized games, colour plus normal is enough; set roughness as one number on the material.

**What size are the textures?** Square pictures at the model's normal size, usually about 1024 px. For a larger tile, pass both `width` and `height` (up to 4096); read the model's page for the sizes it reaches. On mobile and web, a 1024 px tile with mipmaps is plenty.

**Can I make a texture from a photo?** Yes. Upload the photo ([send a picture](/api/jobs#send-a-picture)) and run step 2 with it as the reference and a prompt that says "a seamless tileable texture of the surface in this photo, straight top-down view, flat even light".

**Can I use the textures in a commercial game?** Yes. Every model on the Summer API allows commercial use of what it makes.
