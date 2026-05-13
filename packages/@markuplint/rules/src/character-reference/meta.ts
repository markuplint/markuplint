/** Rule metadata for `character-reference`: categorized as a style rule. */
//
// NOTE: Intentionally does NOT declare `mirrorsParseErrorCodes`. parse5's
// character-reference-related codes
// (`unknown-named-character-reference`, `missing-semicolon-after-character-reference`,
// `absence-of-digits-in-numeric-character-reference`, `null-character-reference`,
// `surrogate-character-reference`, `control-character-reference`,
// `noncharacter-character-reference`, `character-reference-outside-unicode-range`)
// detect *malformed character references* — `&xyz;` whose body is wrong.
// This rule detects the opposite: *missing references* — raw `<`, `>`, `&`, `"`
// that should have been escaped as `&lt;` / `&gt;` / `&amp;` / `&quot;`.
// The two layers are complementary, not duplicates, so the dedupe must NOT
// suppress parse5's character-reference codes when this rule is active.
export default {
	category: 'style',
} as const;
