---
title: "How to make game icons and item sprites with AI"
sidebarTitle: "Icons and item sprites"
description: "Make a matching set of inventory icons and item sprites with AI: one style anchor, the same style words and seed, a reference picture for every icon, transparent backgrounds, the right sizes, pixel art, and simple sprite animation. Exact CLI, API and MCP steps and what it costs."
icon: "gem"
keywords: ["game icons", "inventory icons", "item sprites", "ai icon generator", "pixel art icons", "transparent png", "sprite sheet"]
order: 10
---

One icon is easy. Forty icons that sit in one inventory grid without a single odd one out is hard. Prompt each item on its own and the sword gets a thin outline, the potion a thick one, the shield is seen from the front and the bow from the side, and one of them comes back on a painted checkerboard. At 64 pixels, every one of those differences shows. This guide locks the style on one anchor icon, makes the whole set from that anchor with the same words, the same seed and a reference picture, cuts out real transparency, and then covers sizes, pixel art and a simple animated pickup.

## The chain

```recipe
{
  "steps": [
    {
      "id": "anchor",
      "title": "Style anchor, four takes",
      "models": ["image/recraft-4.1", "image/gpt-image-2.5"],
      "why": "Built for inventory icons and item art in one consistent style, with clean shapes and tight composition; four takes give you a real choice of anchor.",
      "input": {
        "prompt": "Inventory icon of a red health potion: round glass flask, cork stopper, glowing red liquid. Game UI icon, three-quarter view, bold silhouette that reads at 32 px, thick dark brown outline, flat cel shading with one soft highlight, warm fantasy palette. Centered with even padding, plain light grey background, no frame, no text.",
        "aspectRatio": "1:1",
        "numImages": 4,
        "title": "Icon anchor: health potion"
      }
    },
    {
      "id": "set",
      "title": "The icon set",
      "models": ["image/nano-banana-2.1", "image/nano-banana-2"],
      "why": "Edits from the anchor picture, so outline, shading, angle and padding carry into every item, and on Nano Banana models the seed holds the look steady.",
      "count": 24,
      "input": {
        "prompt": "A new inventory icon in exactly the same style, outline, shading, palette, angle and padding as this picture: an iron short sword with a brown leather grip. Game UI icon, three-quarter view, bold silhouette that reads at 32 px, thick dark brown outline, flat cel shading with one soft highlight, warm fantasy palette. Centered with even padding, plain light grey background, no frame, no text.",
        "referenceImageUrl": "{{anchor.fileUrl}}",
        "aspectRatio": "1:1",
        "seed": 811,
        "removeBackground": true,
        "title": "Icon: short sword"
      }
    },
    {
      "id": "frames",
      "title": "Pickup spin frames",
      "models": ["image/nano-banana-2.1", "image/nano-banana-2"],
      "why": "Small edits from one finished icon keep the item the same in every frame, which a single picture of a whole sheet rarely does.",
      "count": 4,
      "input": {
        "prompt": "This same gold coin icon, frame 2 of 4 of a spin: the coin turned 45 degrees so it looks narrower, same size, same position in the picture, same outline, shading and colours. Plain light grey background, no other objects, no text.",
        "referenceImageUrl": "{{set.fileUrl}}",
        "aspectRatio": "1:1",
        "seed": 811,
        "removeBackground": true,
        "title": "Coin spin 2"
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

Your browser opens the Summer sign-in. Pick a spend limit for this computer and choose **Allow**. Using a coding agent? Paste this guide's URL and say "make my inventory icons"; the [quickstart for your agent](/api/agents) connects it in one command.

Decide these before the first job:

- **The item list.** One line per item, with its material and colour: "iron short sword, brown leather grip".
- **The style words.** One block you copy into every prompt: angle, outline, shading, palette, padding, background. In this guide: "Game UI icon, three-quarter view, bold silhouette that reads at 32 px, thick dark brown outline, flat cel shading with one soft highlight, warm fantasy palette. Centered with even padding, plain light grey background, no frame, no text."
- **The smallest size.** The size the icon shows at in the busiest screen, such as 48 px in a hotbar. Design for that size, not for the 1024 px picture.

## Step 1: one anchor icon that sets the style

Pick an item with a clear shape and a few materials, such as a potion: glass, liquid, cork. {{model image/recraft-4.1}} is the model for this step. It is built for icons and item art in one style, and it costs {{price image/recraft-4.1}}.

The words that make icons work:

- **"Three-quarter view"** for every item. It reads better than a flat side view, and one angle across the set is what makes a grid look designed.
- **"Bold silhouette that reads at 32 px"** pushes the model toward big shapes and away from fine detail that turns to noise when small.
- **One outline rule and one shading rule.** "Thick dark brown outline, flat cel shading with one soft highlight." Every icon gets the same.
- **"Centered with even padding"** keeps every item the same size inside its square, so the grid lines up.
- **"No frame, no text."** Draw the slot frame and the stack count in the UI, not in the picture. Then rarity colours and numbers can change in the game.
- **A plain light grey background, not "transparent".** Models asked for transparency paint a grey checkerboard as part of the picture.

`numImages: 4` makes four takes in one job. Pick the one that best fits your game. Keep it on its plain background: it is the reference for the set.

{{step anchor}}

## Step 2: the whole set, from the anchor

Now every other item is an edit of the anchor. Three things together hold the style:

- **The reference picture.** `referenceImageUrl` is the anchor. The model copies its outline, shading, angle and padding.
- **The same style words**, word for word, after the item description.
- **The same seed.** On Nano Banana models the seed keeps the look steady between jobs. Write it down with the style words.

`removeBackground: true` cuts the background away after the picture is made and returns a PNG with real alpha.

{{step set}}

Make the anchor item part of this batch too, so it gets a transparent copy in exactly the same pipeline as the rest.

Look at all 24 icons in a grid at the size the game shows them. A grid shows what one icon at a time hides: one item that is larger, a different angle, an outline that is thinner. Run that one again; it costs {{price image/nano-banana-2.1}} plus the cut-out.

**Other models for this step.** {{model image/muse-image}} makes many fast icon variations at a very low price ({{price image/muse-image}}) and also takes a reference picture. {{model image/flux-3-klein}} is the fast, small model for drafts ({{price image/flux-3-klein}}). For a badge or a card with exact numbers or words on it, use {{model image/gpt-image-2.5}}, which draws exact text.

## Sizes, padding and atlases

The pictures come back at the model's normal size, about 1024 px. Downscale, never upscale:

```bash
magick sword.png -resize 128x128 sword_128.png
```

- **Make each size you ship** from the full picture: 64, 128 and 256 px are common. Export twice the display size for high-density screens.
- **Check the smallest size by eye.** If two icons look the same at 48 px, change one silhouette, not its colour.
- **Pack the set into one atlas** to save draw calls:

```bash
magick montage icons/*.png -tile 8x -geometry 128x128+0+0 -background none icons_atlas.png
```

**Summer Engine.** Import the PNGs and turn mipmaps off for UI pictures. Show an icon with a `TextureRect` set to keep aspect centered. For an atlas, make one `AtlasTexture` per icon with its region. The [`ui-graphics`](/skills/ui-graphics) skill makes the slot frames, buttons and panels in the same style and wires them in. **Any other engine.** The PNG has real alpha. Import it as a UI sprite without compression on the edges.

## Pixel-art icons and sprites

Pixel art has hard rules that image models break by default: a fixed grid, a small palette, no soft edges. The model cannot draw a true 32 by 32 picture. It draws a large picture in pixel style, and you make the real pixels by downscaling.

Change the style words to the pixel rules, and name the palette by its colours:

```text
Pixel art inventory icon of a red health potion, 32x32 sprite, PICO-8 palette, hard 1 px outline in the darkest palette colour, 3-tone shading, three-quarter view, no anti-aliasing, no blur, sharp pixel edges, no smooth gradients. Centered, plain light grey background, no text.
```

Then downscale with nearest-neighbour, so no new colours appear:

```bash
magick potion.png -filter point -resize 32x32 potion_32.png
```

Look at the result at 400 percent and fix stray pixels by hand. At 16 and 32 px, five minutes in a pixel editor beats another take. In Summer Engine, set the default texture filter to Nearest in the project settings, so the whole game stays crisp. The [`pixel-art`](/skills/pixel-art) skill has the full prompt table and the palette rules.

## Step 3: a simple animated pickup

A coin that spins or a gem that pulses makes a pickup feel alive. Make each frame as a small edit of the finished icon: the reference is the icon, and the prompt changes one thing, "the coin turned 45 degrees", "the gem a little brighter".

{{step frames}}

Rules that keep frames steady:

- **Edit every frame from the same finished icon**, not from the frame before it. Chains of edits drift.
- **Small changes only.** A turn, a glow, a bob. Big pose changes break the item.
- **"Same size, same position in the picture"** in every prompt, so the frames line up without a wobble.
- **Four frames are enough** for a spin or a pulse. Play them at 8 to 12 frames per second.

Character sprites with walk cycles and attacks are a bigger job. The [`sprite-sheet`](/skills/sprite-sheet) skill covers the three ways to make them, frame by frame from a reference, one sheet that is sliced into frames, or by hand, and wires the frames into an `AnimatedSprite2D`. For a 3D-looking character, the [3D character](/api/guides/3d-character) guide makes a rigged model you can render from any angle.

## Make every icon in the game

A finished game has a lot of icons: items, abilities, status effects, currencies, map markers, achievements. Write them as one JSONL file, one job per line, each with the anchor as `referenceImageUrl`, the same seed and the same style words:

```jsonl
{"model": "image/nano-banana-2.1", "input": {"prompt": "A new inventory icon in exactly the same style, outline, shading, palette, angle and padding as this picture: a round wooden shield with an iron rim. Game UI icon, three-quarter view, bold silhouette that reads at 32 px, thick dark brown outline, flat cel shading with one soft highlight, warm fantasy palette. Centered with even padding, plain light grey background, no frame, no text.", "referenceImageUrl": "<fileUrl of the anchor>", "seed": 811, "removeBackground": true, "title": "Icon: wooden shield"}}
{"model": "image/nano-banana-2.1", "input": {"prompt": "A new inventory icon in exactly the same style, outline, shading, palette, angle and padding as this picture: a rolled parchment map tied with red string. Game UI icon, three-quarter view, bold silhouette that reads at 32 px, thick dark brown outline, flat cel shading with one soft highlight, warm fantasy palette. Centered with even padding, plain light grey background, no frame, no text.", "referenceImageUrl": "<fileUrl of the anchor>", "seed": 811, "removeBackground": true, "title": "Icon: map"}}
```

```bash
npx -y summer-engine@latest api run --batch icons.jsonl --download art/icons
```

A batch takes up to 500 jobs, is priced when it arrives and runs all or none, so you know the total before anything starts ([batches](/api/jobs#run-many-jobs-batches)). Each job's `title` names the icon in your library.

## Common problems

| You see | Do this |
|---|---|
| A grey checkerboard behind the item | Remove "transparent" from the prompt, ask for a plain light grey background and set `removeBackground: true` |
| One icon is bigger than the rest | Add "centered with even padding" and run it again from the anchor |
| Mixed angles across the set | Put "three-quarter view" in the style words of every prompt |
| Thin outlines on some icons | Send the anchor as `referenceImageUrl` and keep the same seed and style words |
| The model drew a frame or a number | Add "no frame, no text"; draw slots and counts in the UI |
| Mush at 32 px | Ask for a "bold silhouette that reads at 32 px" and less detail; downscale, never upscale |
| Pixel art has soft edges and extra colours | Downscale with `-filter point`, use a named palette, set the texture filter to Nearest |
| Spin frames wobble | Edit every frame from the same finished icon, and say "same size, same position" |

## Questions

**Can I make icons from my own art style?** Yes. Upload one of your icons ([send a picture](/api/jobs#send-a-picture)) and use it as the anchor in step 2.

**What size should I ship?** The display size, times two for high-density screens. Make every size from the full picture.

**Can I use the icons in a commercial game?** Yes. Every model on the Summer API allows commercial use of what it makes.

**Do I need a plan?** No. Jobs are paid from your paid Summer credits, your plan's credits or a top-up. Each connected agent has its own spend limit in Settings > Connected apps.
