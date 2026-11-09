---
title: "How to make a game logo and vector-style art with AI"
sidebarTitle: "A logo and vector art"
description: "Make a game title logo with the exact lettering you typed, on a transparent background, plus an emblem, a one-colour version and flat vector-style illustrations in the same style. Which models get text right, exact CLI, API and MCP steps, what to check before you print or ship, and what it costs."
icon: "pen-tool"
keywords: ["game logo", "ai game logo generator", "title logo", "vector art", "flat illustration", "transparent logo png"]
order: 7
---

A game logo is the one picture where a single wrong letter ruins everything. Most image models draw words as shapes, so "EMBER HOLLOW" comes back as "EMBER HOLOW" or a row of letter-like marks. A logo also has to work at every size: huge on a store page, tiny as a favicon, white on a dark title screen, one colour on a T-shirt. This guide picks the models that are good at words, makes the title logo on a transparent background, builds the variants from it, adds flat vector-style art in the same style, and ends with the checks to run before anything goes to a printer or a store.

Every file is a PNG, JPG or WEBP picture. No model here makes SVG. If you need a true vector file, the last section shows how to trace one.

## The chain

```recipe
{
  "steps": [
    {
      "id": "logo",
      "title": "Title logo, four takes",
      "models": ["image/ideogram-4.5", "image/gpt-image-2.5"],
      "why": "The model for words in images: it spells the title you typed, letter for letter, and four takes in one job give you a real choice.",
      "input": {
        "prompt": "Video game title logo with the exact words \"EMBER HOLLOW\" in two lines, EMBER above HOLLOW. Chunky hand-cut serif letters with a slight upward arc, warm orange to deep red fill, thick dark brown outline, a small ember spark above the letter O. Flat vector style, clean edges, no gradients inside the outline, no texture. Centered on a plain flat background with wide empty space around it. Only these two words, no other text, no tagline.",
        "aspectRatio": "16:9",
        "numImages": 4,
        "removeBackground": true,
        "title": "Ember Hollow logo"
      }
    },
    {
      "id": "variants",
      "title": "Logo variants",
      "models": ["image/gpt-image-2.5", "image/nano-banana-2.1"],
      "why": "Faithful edits: it keeps the letter shapes and colours of the chosen logo while it changes one thing, such as the layout or the colour.",
      "count": 3,
      "input": {
        "prompt": "Make the emblem version of this logo: keep only the ember spark and the letter shapes of the O, inside a round badge with the same thick dark brown outline and the same orange to red fill. No other letters. Flat vector style, clean edges, centered, square, plain flat background.",
        "referenceImageUrl": "{{logo.fileUrl}}",
        "aspectRatio": "1:1",
        "removeBackground": true,
        "title": "Ember Hollow emblem"
      }
    },
    {
      "id": "art",
      "title": "Flat vector-style illustrations",
      "models": ["image/recraft-4.1", "image/gpt-image-2.5"],
      "why": "Clean flat illustration with tight composition, the look that matches a vector logo and traces well if you need a vector file later.",
      "count": 4,
      "input": {
        "prompt": "Flat vector-style spot illustration of a small lantern glowing on a mossy tree stump, for a game loading screen. Warm orange, deep red and dark brown palette with one muted teal accent, thick dark brown outlines, flat colour fills, no gradients, no texture, no text. Centered, wide empty space around it, plain flat background.",
        "aspectRatio": "1:1",
        "removeBackground": true,
        "title": "Loading art: lantern"
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

Your browser opens the Summer sign-in. Pick a spend limit for this computer and choose **Allow**. Using a coding agent? Paste this guide's URL and say "make my game logo"; the [quickstart for your agent](/api/agents) connects it in one command.

Write down three things before the first job. They go into every prompt, word for word:

- **The exact title**, in the capitals you want, with line breaks decided ("EMBER above HOLLOW").
- **The letter style** in plain words: "chunky hand-cut serif", "rounded bubble letters", "sharp condensed sans with a cut through the middle".
- **The palette and outline**: two or three named colours and one outline rule. This sentence becomes the style of everything in this guide.

## Step 1: the title logo, letter for letter

Use a model that was built to draw words. {{model image/ideogram-4.5}} is the one: logos, title cards and signs are what it is for. {{model image/gpt-image-2.5}} is the safe second choice, with exact text and very good light, and it is the one to use when you need to edit the result later.

What makes the words come out right:

- **Put the title in double quotes and say "the exact words".** The model treats quoted text as text to spell, not as a description.
- **Short titles win.** One to three words spell right almost every time. A long subtitle ("and the Curse of the Seven Moons") is where letters go missing. Make the subtitle a separate line of UI text in the engine.
- **Say the layout.** "Two lines, EMBER above HOLLOW" stops the model from choosing for you.
- **Forbid extra text.** "Only these two words, no other text, no tagline." Without it, models add fake small print.
- **Ask for flat colour.** "Flat vector style, no gradients inside the outline, no texture" makes the logo readable at small sizes, clean to cut out, and easy to trace into a vector file.

`removeBackground: true` cuts the background away after the picture is made and returns a PNG with real transparency. Do not write "transparent background" in the prompt instead: models then paint a grey checkerboard as part of the picture. Ask for "a plain flat background" and let the cut-out do the rest.

`numImages: 4` makes four takes in one job. Logos are a taste call, so look at four, not one.

{{step logo}}

Each take is one entry in `result.assets`. Zoom in and read every letter of every take, slowly, before you pick. Then keep the `fileUrl` of the one you chose: it is the reference for step 2.

**Other models for this step.** {{model image/seedream-5-pro}} has strong text in many languages, so it is the one for a localized logo in Japanese, Korean or Chinese ({{price image/seedream-5-pro}}). {{model image/gpt-image-2}} draws precise text and UI ({{price image/gpt-image-2}}).

## Step 2: the variants, from the chosen logo

A game needs the same logo in several shapes. Edit the chosen logo instead of drawing new ones: `referenceImageUrl` keeps the letter shapes and colours, and the prompt changes only one thing per job.

The three variants most games need:

- **The emblem**: the mark without the full title, for the app icon, the favicon, the loading spinner and the store's small square slot.
- **One colour**: "the same logo in solid white only, no outline colour, no shading". It sits on any dark screen, on video and on merch.
- **A wide layout**: "the same words on one line". It fits a thin header or a capsule banner.

{{step variants}}

For each variant, change the prompt and keep the reference the same. Edit from the original logo every time, not from the last variant: each edit drifts a little, and a chain of edits drifts a lot.

When you need the words in a picture that is not the logo, such as a sign in the game world or a poster in a cutscene, use this same step with the logo as the reference, so the lettering matches.

## Step 3: flat vector-style art in the same style

Menus, loading screens, achievement cards and tutorial tips all want small, clean illustrations that look like they belong next to the logo. {{model image/recraft-4.1}} is the model for this: flat illustration and design pieces with tight composition, for {{price image/recraft-4.1}}.

The trick is the same style sentence as the logo, word for word: "Warm orange, deep red and dark brown palette with one muted teal accent, thick dark brown outlines, flat colour fills, no gradients, no texture, no text." Change only the subject at the front: "a small lantern on a stump", "a cracked map", "a fox curled up asleep".

{{step art}}

Tips that make flat art look designed and not generated:

- **One subject, centered, with empty space around it.** Busy scenes lose the flat look and do not cut out cleanly.
- **Name a limited palette.** Three or four named colours. Every colour you do not name is a colour the model may invent.
- **Say "no text".** Illustration models like to add labels.
- **Run the set as one batch.** Four or forty illustrations cost the same per picture, and a batch is priced before it starts ([batches](/api/jobs#run-many-jobs-batches)).

Inside a Summer Engine project, the [`ui-graphics`](/skills/ui-graphics) skill makes buttons, panels and frames in the same style and wires them into the scene.

## Put it in your game

- **Summer Engine.** Drop the PNG into your project, or import it by its `assetId`. Show the title logo with a `TextureRect` set to keep its aspect centered, and turn mipmaps off for UI pictures: they show at or near full size. The [animated title screen](/api/guides/menu-background) guide puts the logo over a looping background.
- **Any other engine.** The PNG has real alpha. Import it as a UI texture with no compression artifacts on the edges (lossless while you work).
- **Store pages.** Key art and covers carry no text: the stores draw the title over them. Upload the logo as its own asset where the store asks for one. The [`store-art`](/skills/store-art) skill lists every slot and size.

## Check it before you print or ship it

A logo leaves the game. It goes on a store page, a trailer, a T-shirt, a sticker. Run these checks once, before any of that.

| Check | How |
|---|---|
| Spelling | Read the logo out loud, letter by letter, from the file, not from memory. Then ask one other person to read it. |
| Small sizes | Shrink it to 64 px and 32 px wide. If the title does not read, use the emblem at those sizes. |
| Light and dark | Put it on white, on black and on your title screen. A dark outline saves an orange logo on a light background. |
| The cut-out | Look inside closed letters (O, A, B, R, the hole of the e). They must be transparent too. Zoom into the edge for a light halo. |
| Print size | A print shop wants about 300 pixels per inch. A 4096 px wide logo prints about 34 cm wide at that density. Ask for `width` and `height` up to 4096 if you plan to print it. |
| Vector need | Some printers and web pages want SVG. See the next section. |
| The name | Search the title in your country's trademark register and in the stores you will ship to. |

### When you need a vector file

The models make pictures, not vector files. When a printer, a sign maker or a web page asks for SVG, trace the PNG with the image trace tool of any vector editor (free ones have it too). Flat colour, thick outlines and no gradients, the style this guide asks for, trace into clean shapes in a few seconds. Check the traced letters against your picture, fix any wobbly curve by hand, and keep the PNG as the source.

## Scale it up

A full brand set is a few dozen pictures: the logo and its variants, an emblem per platform, a set of loading screen illustrations, achievement art. Write them as one JSONL file, one job per line, with the style sentence copied into every prompt, and send them as one batch:

```bash
npx -y summer-engine@latest api run --batch brand-set.jsonl --download art/brand
```

A batch takes up to 500 jobs. It is priced when it arrives and runs all or none, so you know the total before anything starts. Estimate one line of each kind first with `summer api estimate` to tell your team what the whole set costs.

## Common problems

| You see | Do this |
|---|---|
| A letter missing or doubled | Put the title in double quotes, keep it to three words or fewer, and run four takes. Move a long subtitle into the game's UI text |
| Extra small text or a fake tagline | Add "only these words, no other text, no tagline" |
| A grey checkerboard behind the logo | Remove "transparent" from the prompt, ask for "a plain flat background" and set `removeBackground: true` |
| The inside of the O is not transparent | Ask for a plain flat background that is a different colour from the letters, then cut out again |
| Variants drift from the logo | Edit each variant from the original logo, not from the last variant, and change one thing per prompt |
| The illustrations do not match the logo | Copy the palette and outline sentence word for word into every prompt |
| The logo looks soft when printed | Ask for a larger `width` and `height`, or trace it into a vector file |

## Questions

**Can I get an SVG?** Not from these models: they return PNG, JPG or WEBP. Trace the PNG as shown above. Flat-colour logos trace well.

**Can I use the logo commercially and trademark it?** Every model on the Summer API allows commercial use of what it makes. Trademark law is about your name and its use, not the tool; check your local register before you file.

**Can I start from my own sketch?** Yes. Upload it first ([send a picture](/api/jobs#send-a-picture)), then run step 2 with your sketch as the `referenceImageUrl` and a prompt that names the exact words.

**Do I need a plan?** No. Jobs are paid from your paid Summer credits, your plan's credits or a top-up. Each connected agent has its own spend limit in Settings > Connected apps.
