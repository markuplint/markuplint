export default {
	category: 'validation',
	// This rule covers parse5's `missing-doctype` event (the "no DOCTYPE at
	// all" case). parse5's `non-conforming-doctype` and `misplaced-doctype`
	// are NOT mirrored — they have judgement criteria that differ from this
	// rule's `denyObsoleteType` (e.g. parse5 flags `<!DOCTYPE HTML>` for
	// uppercase, this rule does not). Users who want those should opt in
	// via `severity.parseError` separately.
	mirrorsParseErrorCodes: ['missing-doctype'],
} as const;
