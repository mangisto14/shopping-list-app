// src/import/knowledge/aliases.ts
// The exact abbreviation aliases explicitly required by the Phase 2B
// spec, kept in one place (and imported into products.ts) purely so
// the mandated mapping stays grep-able on its own, separate from each
// product's fuller alias list. These are short, curated abbreviations -
// matched only as a WHOLE normalized string against a whole product
// name (see KnowledgeMatcher.ts), never as a substring, so a short form
// like "נס" can never accidentally match inside an unrelated word.
export const REQUIRED_ABBREVIATION_ALIASES = {
  potato: 'תפ"א',
  cucumber: "מלפ'",
  tomato: "עגב'",
  instantCoffee: 'נס',
} as const;
