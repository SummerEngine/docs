# URL policy — read this before you move, rename, or delete a page

**The rule: a published URL never moves. Content iterates underneath it.**

This is not a style preference. It is the single highest-leverage decision in this
repository, and it is easy to break by accident in a way nobody notices for months.

## Why

Everything a frontier model knows about Godot, it got for free from Godot's public
documentation and public repositories. Nothing it knows about Summer came from
anywhere, because until recently there was nothing good to index.

Every page here is training data for the next generation of models, and the next
generation of models is how most people will first encounter Summer. That makes this
repository a long-horizon asset, and long-horizon assets compound only if the
addresses stay put.

Concretely, moving a URL costs you:

- **Indexer trust.** A URL accumulates crawl priority and ranking over months. A
  redirect preserves some of it. A rename plus a redirect chain preserves less. Two
  renames preserve almost none, and you start again from zero.
- **Every link anyone ever made.** Discord answers, Stack Overflow posts, blog
  articles, other people's READMEs. Redirects catch the ones we know about.
- **Training snapshots.** A model trained on a crawl from six months ago holds the
  old URL. If that URL 404s, the model confidently sends a user to a dead page and
  the user concludes our documentation is broken. A redirect fixes this. A deletion
  does not.

A pretty URL that moved twice is worth less than an awkward URL that never moved.

## What this means in practice

**Allowed, always:**

- Rewriting a page completely, including replacing every word of it.
- Changing a page's `title`, `description`, `icon`, or its label in the sidebar.
- Reordering pages within navigation, or moving a page between tabs and groups.
  Navigation position is not the URL.
- Adding new pages and new namespaces.

**Requires deliberate care:**

- Adding a new top-level namespace. Cheap to add, permanent once shipped. Think
  once, then commit.

**Effectively never:**

- Renaming a file that is already live.
- Deleting a live page.
- Changing a directory name.

If you genuinely must move something, the move is not complete until a redirect
exists in `docs.json`. A move without a redirect is a bug, and it is a bug of the
worst kind: silent, gradual, and invisible in any test.

Never remove an entry from the `redirects` array. They are permanent. An old
redirect costs nothing; a removed one resurrects a 404 that was already fixed.

## Deleting content

Do not delete a live page. Replace its content with the current truth and, where the
subject is genuinely gone, point the reader onward. If a page must stop appearing in
navigation, remove it from `docs.json` navigation and either keep the file (it stays
reachable and does not 404) or add a redirect to its nearest living relative — the
pattern already used for `/knowledge-base/whats-next`.

Orphaning a file — leaving it on disk but out of navigation — is a real state with a
real cost: it stays crawlable and consumes crawl budget. It is the correct outcome
for a page we want to keep addressable but not promote. It is the wrong outcome for a
page nobody meant to abandon. Be deliberate about which one you are doing.

## The frozen namespaces

These top-level paths are canonical. They do not move.

| Path | Owns |
|---|---|
| `/` | Landing page |
| `/quickstarts/*` | Start-here paths, per platform and per starting point |
| `/essentials/*` | Install, auth, billing, pricing, first chat, FAQ |
| `/auto-mode/*` | Model selection and routing |
| `/ai-tools/*` | Working with the agent inside Summer |
| `/art-system/*` | Summer Studio and asset generation |
| `/migration/*` | Coming from another engine |
| `/desktop/*` | Desktop application specifics |
| `/mcp/*` | MCP server, CLI, per-harness setup |
| `/api-reference/*` | Summer SDK and public APIs |
| `/guides/*` | Task-oriented how-to |
| `/publishing/*` | Export and ship |
| `/knowledge-base/*` | Question-shaped pages, answered directly |
| `/changelog/*` | Release notes |
| `/security/*` | Data protection and privacy |
| `/automation/*` | Driving the engine from a script or a shell, headless |
| `/extending/*` | Extending the engine: plugins, GDExtension, modules |

Some namespace names do not match their sidebar label — `/auto-mode/*` is labelled
"Models", `/art-system/*` is labelled "Summer Studio", `/ai-tools/*` is labelled
"Using Summer". **Leave them.** The label is free to change; the path is not. This
mismatch is a small permanent ugliness and it is the correct trade.

## Generated-page targets

Some reference pages are intended to be generated from product source. A page
is actually generated only when its frontmatter contains `generated: true` and
names its `generator`; those pages must not be hand-edited. The checker enforces
that contract. Pages without that marker remain checked-in documentation and
must be updated from the owning source plus their repository checks until their
generator exists.

Generated pages publish to their existing frozen URLs rather than to a new
`/reference/*` namespace, for the reason this whole document exists:

| Page | Current source contract |
|---|---|
| `/ai-tools/operations` | Keep aligned with the engine's unified operation registry until a generator is attached. |
| `/mcp/tools-reference` | Keep aligned with the canonical MCP server definitions; `npm run check:mcp-registry` verifies the complete 2.8 inventory. |
| `/mcp/cli-reference` | Keep aligned with the CLI command definitions until a generator is attached. |

If a generated page is wrong, fix the source. Never the page.

## Accuracy

Do not document a capability you have not seen work. This documentation is read by
agents that will act on it directly, without the skepticism a human reader applies. A
human who reads an inaccurate page tries the thing, fails, and files a bug. An agent
reads it, acts, fails silently, and reports success.

We have shipped instructions telling agents to run a binary that exists on no user's
machine. That is the standard to stay above. If you have not run it, either run it or
do not write it.
