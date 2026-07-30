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
    pattern:
      /\bworks?\b(?:\s+in\s+Summer)?\s+(?:perfectly|identically|exactly|as-is|unchanged|without changes)\b/gi,
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
  for (const claim of claimGroups(raw)) {
    for (const clause of claim.clauses) {
      for (const rule of compatibilityRules) {
        rule.pattern.lastIndex = 0;
        for (const match of clause.matchAll(rule.pattern)) {
          if (isLocallyNegated(clause, match.index)) continue;
          if (isLocallyModal(clause, match.index)) continue;
          errors.push({
            rule: rule.id,
            line: claim.line,
            match: match[0],
            help: rule.help,
          });
        }
      }
    }
  }
  return errors;
}

function sentenceUnits(raw) {
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

const splitClauses = (text) =>
  text
    .split(
      /\s*(?:;|,\s*(?:but|yet|however|nevertheless)\b|\b(?:but|however|nevertheless)\b|(?<!\bnot\s)(?<!n't\s)\byet\b)\s*/i,
    )
    .map((clause) => clause.trim())
    .filter(Boolean);

function claimGroups(raw) {
  return sentenceUnits(raw).map((sentence) => ({
    line: sentence.line,
    text: sentence.text,
    clauses: splitClauses(sentence.text),
  }));
}

const LOCAL_NEGATION =
  /(?:^|\b)(?:not|never|cannot|can't|couldn't|doesn't|does\s+not|do\s+not|did\s+not|isn't|is\s+not|aren't|are\s+not|won't|will\s+not|must\s+not|no|without|rather\s+than|instead\s+of)(?:\s+[\w'’.-]+){0,7}\s*$/i;
const LOCAL_MODAL = /(?:^|\b)(?:may|might|could)(?:\s+[\w'’.-]+){0,4}\s*$/i;
const LOCAL_HYPOTHETICAL =
  /(?:^|\b)(?:if|assuming|supposing)(?:\s+[\w'’.-]+){0,10}\s*$/i;
const ASSERTION_SCOPE_BREAK =
  /\b(?:and|but|however|nevertheless|while|whereas|then)\b|(?<!\bnot\s)(?<!n't\s)\byet\b/i;

function localAssertionPrefix(text, assertionIndex) {
  const prefix = text
    .slice(0, assertionIndex)
    .replace(/[,:[\](){}]/g, " ")
    .replace(/\s+/g, " ");
  const scopes = prefix.split(ASSERTION_SCOPE_BREAK);
  return scopes.at(-1);
}

function isLocallyNegated(text, assertionIndex) {
  return LOCAL_NEGATION.test(localAssertionPrefix(text, assertionIndex));
}

function isLocallyModal(text, assertionIndex) {
  return LOCAL_MODAL.test(localAssertionPrefix(text, assertionIndex));
}

function isLocallyHypothetical(text, assertionIndex) {
  return LOCAL_HYPOTHETICAL.test(localAssertionPrefix(text, assertionIndex));
}

function localAssertionScope(text, assertionIndex) {
  const prefix = localAssertionPrefix(text, assertionIndex);
  const suffix = text.slice(assertionIndex).split(ASSERTION_SCOPE_BREAK)[0];
  return `${prefix}${suffix}`;
}

function isLocalOrPrivateTestAssertion(text, assertionIndex) {
  const scope = localAssertionScope(text, assertionIndex);
  if (/\bproduction\b/i.test(scope)) return false;
  return [
    /\b(?:local|private|test|development|dev-only)\s+(?:test\s+)?(?:harness|runner|environment|session|fixture|simulation|sandbox|mode|build)\b/i,
    /\bin\s+(?:a|the)?\s*(?:local|private|test|development)\s+(?:test|environment|session|harness|runner|mode|build)\b/i,
    /\b(?:locally|privately)\b/i,
    /\b(?:local|private|test)\s+only\b/i,
  ].some((pattern) => pattern.test(scope));
}

function beginsWithCapabilityAnaphor(text) {
  const value = text
    .replace(/^(?:[-*+>#|]|\d+\.)+\s*/, "")
    .replace(/^(?:but|yet|however|nevertheless),?\s+/i, "")
    .replace(/^[,:\s]+/, "")
    .trim();
  return (
    /^(?:it|they)\b/i.test(value) ||
    /^(?:this|that)\s+(?:is|was|remains?|runs?|loads?|executes?|provides?|keeps?|stores?|writes?|capability|service|runtime|backend|transport|system|feature|path)\b/i.test(
      value,
    ) ||
    /^(?:these|those)\s+(?:are|were|remain|run|load|execute|provide|keep|store|write|capabilities|services|runtimes|backends|transports|systems|features|paths)\b/i.test(
      value,
    )
  );
}

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const irregularVerbForms = new Map([
  ["keep", ["keep", "keeps", "kept", "keeping"]],
  ["run", ["run", "runs", "ran", "running"]],
  ["write", ["write", "writes", "wrote", "written", "writing"]],
]);

function regularVerbForms(verb) {
  const forms = new Set([verb]);
  if (verb.endsWith("e")) {
    forms.add(`${verb}s`);
    forms.add(`${verb}d`);
    forms.add(`${verb.slice(0, -1)}ing`);
  } else if (/(?:s|x|z|ch|sh)$/.test(verb)) {
    forms.add(`${verb}es`);
    forms.add(`${verb}ed`);
    forms.add(`${verb}ing`);
  } else if (verb.endsWith("y") && !/[aeiou]y$/.test(verb)) {
    forms.add(`${verb.slice(0, -1)}ies`);
    forms.add(`${verb.slice(0, -1)}ied`);
    forms.add(`${verb}ing`);
  } else {
    forms.add(`${verb}s`);
    forms.add(`${verb}ed`);
    forms.add(`${verb}ing`);
  }
  return [...forms];
}

const verbPattern = (verb) => {
  const forms = irregularVerbForms.get(verb) ?? regularVerbForms(verb);
  return new RegExp(`\\b(?:${forms.map(escapeRegex).join("|")})\\b`, "gi");
};

const compile = (patterns, flags = "i") =>
  (patterns ?? []).map((pattern) => new RegExp(pattern, flags));

function compileCapability(capability) {
  const objectRequiredVerbs = new Set(capability.objectRequiredAssertionVerbs ?? []);
  return {
    ...capability,
    aliasPatterns: compile(capability.subjectAliases),
    assertionPatterns: [
      ...compile(capability.assertionPatterns, "gi").map((pattern) => ({
        pattern,
        kind: "pattern",
        requiresObject: false,
      })),
      ...compile(capability.objectRequiredAssertionPatterns, "gi").map((pattern) => ({
        pattern,
        kind: "pattern",
        requiresObject: true,
      })),
      ...compile(capability.assertionTerms, "gi").map((pattern) => ({
        pattern,
        kind: "term",
        requiresObject: false,
      })),
      ...(capability.assertionVerbs ?? []).map((verb) => ({
        pattern: verbPattern(verb),
        kind: "verb",
        requiresObject: objectRequiredVerbs.has(verb),
      })),
    ],
    assertionObjectPatterns: compile(capability.assertionObjectPatterns),
    coreferenceObjectPatterns: compile(capability.coreferenceObjectPatterns),
    objectPronounPatterns: compile(capability.objectPronounPatterns),
    statusPatterns: compile(capability.statusTerms),
    disclaimerPatterns: compile(capability.disclaimerPatterns),
    assertionBeforeSubjectPatterns: compile(capability.assertionBeforeSubjectPatterns),
  };
}

function clauseHasAlias(clause, capability) {
  return capability.aliasPatterns.some((pattern) => pattern.test(clause));
}

function firstAliasIndex(clause, capability) {
  let first = Number.POSITIVE_INFINITY;
  for (const pattern of capability.aliasPatterns) {
    const match = clause.match(pattern);
    if (match?.index < first) first = match.index;
  }
  return first;
}

function assertionMatches(clause, capability) {
  const matches = [];
  for (const assertion of capability.assertionPatterns) {
    const { pattern } = assertion;
    pattern.lastIndex = 0;
    for (const match of clause.matchAll(pattern)) {
      matches.push({
        index: match.index,
        text: match[0],
        kind: assertion.kind,
        requiresObject: assertion.requiresObject,
      });
    }
  }
  return matches.sort((a, b) => a.index - b.index);
}

function assertionTermIsPredicate(clause, assertion, capability) {
  if (assertion.kind !== "term") return true;
  const prefix = localAssertionPrefix(clause, assertion.index).trim();
  if (
    /(?:^|\b)(?:is|are|was|were|remains?|becomes?|stays?)(?:\s+(?:not|never|currently|presently|production[- ]?))*\s*$/i.test(
      prefix,
    )
  ) {
    return true;
  }

  for (const alias of capability.aliasPatterns) {
    const match = clause.match(alias);
    if (!match || match.index > assertion.index) continue;
    const gap = clause.slice(match.index + match[0].length, assertion.index);
    const normalizedGap = gap.replace(/^(?:\s|[*_`|:()-])+|(?:\s|[*_`|:()-])+$/g, "");
    if (
      !normalizedGap ||
      /^(?:is|are|was|were|remains?|becomes?|stays?)(?:\s+(?:not|never|currently|presently|production[- ]?))*$/i.test(
        normalizedGap,
      )
    ) {
      return true;
    }
  }
  return prefix.replace(/^[,:\s]+/, "").length === 0;
}

function assertionHasCompatibleObject(
  clause,
  assertion,
  capability,
  { allowObjectPronoun = false } = {},
) {
  if (!assertion.requiresObject) return true;
  const scope = localAssertionScope(clause, assertion.index);
  if (capability.assertionObjectPatterns.some((pattern) => pattern.test(scope))) return true;
  return (
    allowObjectPronoun &&
    capability.objectPronounPatterns.some((pattern) => pattern.test(scope))
  );
}

function compatibleAssertionMatches(clause, capability, options = {}) {
  return assertionMatches(clause, capability).filter(
    (assertion) =>
      assertionTermIsPredicate(clause, assertion, capability) &&
      assertionHasCompatibleObject(clause, assertion, capability, options),
  );
}

function beginsWithEllipticalCapabilityPredicate(clause, capability, options = {}) {
  const value = clause
    .replace(/^(?:[-*+>#|]|\d+\.)+\s*/, "")
    .replace(/^(?:but|yet|however|nevertheless),?\s+/i, "")
    .replace(/^[,:\s]+/, "")
    .trim();
  return compatibleAssertionMatches(value, capability, options).some((assertion) => {
    if (assertion.index === 0) return true;
    const prefix = value.slice(0, assertion.index).trim();
    return /^(?:(?:is|are|was|were|remains?|becomes?|can|could|may|might|will|would|does|do)\b(?:\s+\w+){0,2})$/i.test(
      prefix,
    );
  });
}

function introducesExplicitCoreferenceObject(clause, capability) {
  if (!capability.coreferenceObjectPatterns.some((pattern) => pattern.test(clause))) {
    return false;
  }
  return compatibleAssertionMatches(clause, capability).some(
    (assertion) => assertion.requiresObject,
  );
}

function isLocallyDisclaimed(clause, assertionIndex, capability) {
  const prefix = localAssertionPrefix(clause, assertionIndex);
  return capability.disclaimerPatterns.some((pattern) => pattern.test(prefix));
}

export function scanCapabilityClaims(raw, policy) {
  const errors = [];
  const capabilities = (policy.claimCapabilities ?? []).map(compileCapability);
  let previousSentenceCapabilities = [];

  for (const claim of claimGroups(raw)) {
    const firstClauseIsAnaphoric = beginsWithCapabilityAnaphor(claim.clauses[0] ?? "");
    let carriedCapabilities = firstClauseIsAnaphoric ? previousSentenceCapabilities : [];
    let sentenceCapabilities = carriedCapabilities;
    let priorClauseObjectCapabilities = new Set();
    for (const clause of claim.clauses) {
      const explicitCapabilities = capabilities.filter((capability) =>
        clauseHasAlias(clause, capability),
      );
      const ellipticalCapabilities = carriedCapabilities.filter((capability) =>
        beginsWithEllipticalCapabilityPredicate(clause, capability, {
          allowObjectPronoun: priorClauseObjectCapabilities.has(capability.id),
        }),
      );
      const activeCapabilities = explicitCapabilities.length
        ? explicitCapabilities
        : beginsWithCapabilityAnaphor(clause)
          ? carriedCapabilities
          : ellipticalCapabilities;
      if (explicitCapabilities.length) {
        carriedCapabilities = explicitCapabilities;
        sentenceCapabilities = explicitCapabilities;
      } else if (activeCapabilities.length) {
        sentenceCapabilities = activeCapabilities;
      }

      for (const capability of activeCapabilities) {
        const aliasIndex = firstAliasIndex(clause, capability);
        const assertions = compatibleAssertionMatches(clause, capability, {
          allowObjectPronoun: priorClauseObjectCapabilities.has(capability.id),
        }).filter(
          (assertion) =>
            !capability.assertionAfterSubject ||
            !Number.isFinite(aliasIndex) ||
            assertion.index > aliasIndex ||
            capability.assertionBeforeSubjectPatterns.some((pattern) =>
              pattern.test(clause.slice(assertion.index)),
            ),
        );
        const hasStatus = capability.statusPatterns.some((pattern) => pattern.test(clause));
        if (!assertions.length && hasStatus) continue;

        const positive = assertions.find(
          (assertion) =>
            !isLocallyNegated(clause, assertion.index) &&
            !isLocallyDisclaimed(clause, assertion.index, capability) &&
            !isLocallyModal(clause, assertion.index) &&
            !isLocallyHypothetical(clause, assertion.index) &&
            !isLocalOrPrivateTestAssertion(clause, assertion.index),
        );
        if (!positive) continue;

        errors.push({
          capability: capability.id,
          state: capability.state,
          line: claim.line,
          text: clause,
          assertion: positive.text,
          help:
            `${capability.label} is ${capability.state}. Describe a contract/example or link to the ` +
            "canonical status instead of implying deployed production behavior.",
        });
      }
      priorClauseObjectCapabilities = new Set(
        explicitCapabilities
          .filter((capability) => introducesExplicitCoreferenceObject(clause, capability))
          .map((capability) => capability.id),
      );
    }
    previousSentenceCapabilities = sentenceCapabilities;
  }

  return errors;
}
