// Pin each Summer API model's summerengine.com/models/<slug> page from a
// PublicSummerEngine checkout (src/lib/models/model-api.ts modelSlugsByApiId).
// Run it from the PSE checkout, with its own dependencies:
//   NODE_OPTIONS=--conditions=react-server npx tsx <docs>/scripts/api/site-slugs.mts <docs>/scripts/api/sources/site-model-slugs.json
// then `npm run generate:api` in the docs.
import { writeFileSync } from 'node:fs';
const mod = await import(process.cwd() + '/src/lib/models/model-api.ts');
const map = mod.modelSlugsByApiId();
writeFileSync(process.argv[2], JSON.stringify({ source: 'PublicSummerEngine src/lib/models/model-api.ts modelSlugsByApiId', slugs: Object.fromEntries([...map].sort()) }, null, 2) + '\n');
console.log('slugs', map.size);
process.exit(0);
