# Summer Documentation

The official documentation for Summer, The AI Game Engine.

This repository contains:

- Getting started guides
- AI operations documentation  
- Engine migration guides
- API reference
- Community resources

**[View the full documentation](https://docs.summerengine.com)**

## Before you change anything

Read **[URL-POLICY.md](./URL-POLICY.md)**. One rule matters more than the rest: a
published URL never moves, and content iterates underneath it. Renaming a live page
is the easiest way to do lasting damage here, and it will not show up in any test.

That document also lists which pages are generated from source and must not be
hand-edited, and states the accuracy bar: do not document a capability you have not
seen work.

## Development

Install the [Mintlify CLI](https://www.npmjs.com/package/mint) to preview documentation changes locally. To install, use the following command:

```
npm i -g mint
```

Run the following command at the root of your documentation, where your `docs.json` is located:

```
mint dev
```

View your local preview at `http://localhost:3000`.

## Publishing changes

Documentation changes are deployed automatically after pushing to the main branch.

## Need help?

### Troubleshooting

- If your dev environment isn't running: Run `mint update` to ensure you have the most recent version of the CLI.
- If a page loads as a 404: Make sure you are running in a folder with a valid `docs.json`.

### Resources
- [Summer documentation](https://docs.summerengine.com)
- [Summer community](https://discord.gg/yUpgtxnZky)
