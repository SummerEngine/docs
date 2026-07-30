const maskComments = (value) =>
  value
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, (match) => match.replace(/[^\n]/g, " "))
    .replace(/<!--[\s\S]*?-->/g, (match) => match.replace(/[^\n]/g, " "));

const identityRules = [
  {
    id: "godot-game",
    pattern: /\bGodot games?\b/gi,
    help: "Use Summer game in creator-facing prose and prompts.",
  },
  {
    id: "godot-sdk",
    pattern: /\bGodot SDK\b/gi,
    help: "The creator-facing platform contract is the Summer SDK.",
  },
  {
    id: "summer-godot-product",
    pattern: /\bSummer\s*\/\s*Godot\b/gi,
    help: "Call the creator product Summer Engine.",
  },
  {
    id: "default-godot-45",
    pattern:
      /(?:\b(?:install|download|require|required|prerequisite|use|run)\b.{0,100}\bGodot(?: Engine)?\s+4\.5\b|\bGodot(?: Engine)?\s+4\.5\b.{0,100}\b(?:install|download|required|prerequisite|use|run)\b)/gi,
    help: "Default onboarding installs Summer Engine; the pinned current upstream feature tag is not 4.5.",
  },
  {
    id: "godot-product-equivalence",
    pattern:
      /\b(?:Summer(?: Engine)? (?:is|projects? are) Godot|Summer games? (?:are|is) Godot|Godot is (?:the )?Summer Engine)\b/gi,
    help: "Upstream lineage is a compatibility fact, not Summer product identity.",
  },
  {
    id: "upstream-as-product-version",
    pattern: /\bSummer Engine\s+4\.\d+(?:\.\d+)?\b/gi,
    help: "Do not present the upstream technical base as the Summer Engine product release.",
  },
];

export function scanIdentityText(raw, { currentFeature } = {}) {
  const errors = [];
  const masked = maskComments(raw);
  const lines = masked.split("\n");

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex];
    for (const rule of identityRules) {
      rule.pattern.lastIndex = 0;
      for (const match of line.matchAll(rule.pattern)) {
        errors.push({
          rule: rule.id,
          line: lineIndex + 1,
          match: match[0],
          help: rule.help,
        });
      }
    }
  }

  if (currentFeature) {
    const featurePattern = /config\/features\s*=\s*PackedStringArray\(\s*"(\d+\.\d+)"/g;
    for (const match of masked.matchAll(featurePattern)) {
      if (match[1] === currentFeature) continue;
      errors.push({
        rule: "stale-project-feature",
        line: masked.slice(0, match.index).split("\n").length,
        match: match[0],
        help:
          `Project/config examples must use the current upstream feature tag ${currentFeature}; ` +
          "Summer Engine follows upstream continuously.",
      });
    }
  }

  return errors;
}

const compatibilityRules = [
  {
    id: "blanket-works-perfectly",
    pattern: /\bworks?\s+(?:perfectly|identically|exactly|as-is|unchanged|without changes)\b/gi,
    help: "Compatibility ranges are unmeasured; require a committed-copy test and explicit caveats.",
  },
  {
    id: "blanket-no-conversion",
    pattern: /\bno conversion required\b/gi,
    help: "Familiar formats do not prove zero conversion or import work for every project.",
  },
  {
    id: "blanket-all-assets",
    pattern:
      /\b(?:all|every)\b.{0,80}\b(?:existing projects?|scenes?|scripts?|plugins?|tutorials?|assets?)\b.{0,80}\b(?:work|works|open|compatible|apply)\b/gi,
    help: "Avoid universal compatibility claims; name measured formats and version-sensitive checks.",
  },
  {
    id: "blanket-completely-compatible",
    pattern: /\bcompletely compatible\b/gi,
    help: "Project minimum and recommended compatibility ranges are unmeasured.",
  },
  {
    id: "blanket-open-as-is",
    pattern: /\bopen\b.{0,50}\bprojects?\s+as-is\b/gi,
    help: "Opening an existing project is a compatibility evaluation, not an as-is guarantee.",
  },
  {
    id: "blanket-transitive-load",
    pattern: /\bif it loads\b.{0,100}\bit loads\b/gi,
    help: "An upstream load is evidence, not proof for Summer, another platform, or export.",
  },
];

export function scanCompatibilityClaims(raw) {
  const errors = [];
  for (const unit of claimUnits(raw)) {
    for (const rule of compatibilityRules) {
      rule.pattern.lastIndex = 0;
      for (const match of unit.text.matchAll(rule.pattern)) {
        const nonUniversalPossibility =
          /\bmight\s+work\s+perfectly\b/i.test(unit.text) &&
          /\b(?:but|however|yet)\b/i.test(unit.text);
        if (nonUniversalPossibility) continue;
        errors.push({
          rule: rule.id,
          line: unit.line,
          match: match[0],
          help: rule.help,
        });
      }
    }
  }
  return errors;
}

function claimUnits(raw) {
  const lines = maskComments(raw).split("\n");
  const visible = lines.map(() => "");
  let inFrontmatter = lines[0]?.trim() === "---";

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    if (inFrontmatter) {
      if (index > 0 && line.trim() === "---") {
        inFrontmatter = false;
        continue;
      }
      const field = line.match(/^(title|description)\s*:\s*(.*)$/);
      if (field) visible[index] = field[2].replace(/^["']|["']$/g, "");
      continue;
    }

    const fence = line.match(/^\s*(`{3,}|~{3,})/);
    if (fence) {
      continue;
    }

    visible[index] = line
      .replace(/\]\([^)]*\)/g, "]")
      .replace(/\b(?:href|src|url)\s*=\s*["'][^"']*["']/g, " ");
  }

  const segments = [];
  let paragraph = [];
  let paragraphStart = 1;
  const flush = () => {
    if (!paragraph.length) return;
    const text = paragraph.join(" ");
    for (const sentence of text.split(/(?<=[.!?])\s+/)) {
      const trimmed = sentence.trim();
      if (trimmed) segments.push({ line: paragraphStart, text: trimmed });
    }
    paragraph = [];
  };

  for (let index = 0; index < visible.length; index++) {
    const line = visible[index].trim();
    if (!line) {
      flush();
      continue;
    }
    if (/^(?:#{1,6}\s|[-*+]\s|\d+\.\s|\||<)/.test(line)) {
      flush();
      for (const sentence of line.split(/(?<=[.!?])\s+/)) {
        if (sentence.trim()) segments.push({ line: index + 1, text: sentence.trim() });
      }
      continue;
    }
    if (!paragraph.length) paragraphStart = index + 1;
    paragraph.push(line);
  }
  flush();
  return segments;
}

const compile = (patterns) => patterns.map((pattern) => new RegExp(pattern, "i"));
const wordStems = (value) => (value.toLocaleLowerCase("en-US").match(/[a-z0-9_.-]+/g) ?? []);
const hasStem = (words, rawStem) => {
  const stem = rawStem.toLocaleLowerCase("en-US");
  const last = stem.at(-1);
  const variants = new Set([
    stem,
    `${stem}s`,
    `${stem}es`,
    `${stem}ed`,
    `${stem}ing`,
    `${stem}ly`,
    `${stem}ally`,
    `${stem}${last}ing`,
  ]);
  if (stem.endsWith("e")) {
    variants.add(`${stem.slice(0, -1)}ing`);
    variants.add(`${stem}d`);
  }
  return words.some((word) => variants.has(word));
};
const matchesTokenFamilies = (words, families) =>
  (families ?? []).some((family) => family.every((stem) => hasStem(words, stem)));

export function scanCapabilityClaims(raw, policy) {
  const errors = [];
  const negative = compile(policy.negativeClaimPatterns ?? []);

  for (const capability of policy.claimCapabilities ?? []) {
    const subjects = compile(capability.subjectPatterns ?? []);
    const positives = compile(capability.positivePatterns ?? []);
    for (const segment of claimUnits(raw)) {
      const words = wordStems(segment.text);
      const hasSubject =
        subjects.some((pattern) => pattern.test(segment.text)) ||
        matchesTokenFamilies(words, capability.subjectTokenFamilies);
      const hasAssertion =
        positives.some((pattern) => pattern.test(segment.text)) ||
        matchesTokenFamilies(words, capability.assertionTokenFamilies);
      if (!hasSubject || !hasAssertion) continue;
      if (negative.some((pattern) => pattern.test(segment.text))) continue;
      errors.push({
        capability: capability.id,
        state: capability.state,
        line: segment.line,
        text: segment.text,
        help:
          `${capability.label} is ${capability.state}. Describe a contract/example or link to the ` +
          "canonical status instead of implying deployed production behavior.",
      });
    }
  }

  return errors;
}
