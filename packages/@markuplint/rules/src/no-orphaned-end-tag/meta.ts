export default {
	category: 'syntax',
	fixable: true,
	// Mirrors parse5's `end-tag-without-matching-open-element`. This rule
	// reads `text.isBogus` (set by parser-utils from parse5's tree-construction
	// step) so the detection is by definition aligned with parse5's judgement.
	mirrorsParseErrorCodes: ['end-tag-without-matching-open-element'],
} as const;
