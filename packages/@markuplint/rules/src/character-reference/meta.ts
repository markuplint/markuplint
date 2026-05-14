/** Rule metadata for `character-reference`: categorized as a style rule. */
//
// This rule claims responsibility for both directions of HTML LS's character
// reference conformance:
//
// 1. **Missing references** (self-detection): raw `<`, `>`, `&`, `"` in text
//    or attribute values that should have been escaped (`&lt;` / `&gt;` /
//    `&amp;` / `&quot;`).
// 2. **Malformed references** (parse5 hook): the eight `*-character-reference`
//    codes parse5 emits for `&...;` whose body is wrong — unknown names,
//    missing semicolons, NULL / surrogate / control / noncharacter / out-of-range
//    numeric references. The rule reads `document.parseErrors` and converts
//    these into its own violations.
//
// Both classes report under `ruleId: 'character-reference'`, so a user who
// enables this rule gets the full HTML LS conformance scope for character
// references in a single switch. ml-core suppresses the mirrored parse5
// codes unconditionally — they only ever surface through this rule.
export default {
	category: 'style',
	mirrorsParseErrorCodes: [
		'unknown-named-character-reference',
		'missing-semicolon-after-character-reference',
		'absence-of-digits-in-numeric-character-reference',
		'null-character-reference',
		'surrogate-character-reference',
		'control-character-reference',
		'noncharacter-character-reference',
		'character-reference-outside-unicode-range',
	],
} as const;
