// This rule reads `document.parseErrors` and converts parse5's eight
// `*-character-reference` malformed-reference codes — unknown names, missing
// semicolons, NULL / surrogate / control / noncharacter / out-of-range
// numeric references — into its own violations, so a user who enables this
// rule sees them under `ruleId: 'no-malformed-character-reference'` instead
// of the built-in `parse-error` channel. ml-core suppresses the mirrored
// codes unconditionally — they only ever surface through this rule.
export default {
	category: 'syntax',
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
