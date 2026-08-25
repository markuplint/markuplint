export default {
	category: 'validation',
	// This rule covers parse5's `missing-doctype` event (the "no DOCTYPE at
	// all" case). parse5's `non-conforming-doctype` and `misplaced-doctype`
	// are NOT mirrored by either doctype rule — they have judgement criteria
	// that differ from `no-obsolete-doctype` (e.g. parse5 flags
	// `<!DOCTYPE HTML>` for uppercase, that rule does not). Users who want
	// those should opt in via `severity.parseError` separately.
	mirrorsParseErrorCodes: ['missing-doctype'],
} as const;
