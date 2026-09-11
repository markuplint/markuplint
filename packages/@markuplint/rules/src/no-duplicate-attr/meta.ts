export default {
	category: 'syntax',
	fixable: true,
	// This rule's detection is a superset of parse5's `duplicate-attribute`
	// event: parse5 only fires on HTML elements (case-insensitive), while
	// this rule also covers JSX / SVG / authored components. When the rule
	// is active, ml-core dedupes the built-in parse-error channel so users
	// don't see two violations for the same duplicate.
	mirrorsParseErrorCodes: ['duplicate-attribute'],
} as const;
