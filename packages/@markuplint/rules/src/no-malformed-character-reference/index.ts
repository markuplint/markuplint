import { createRule } from '@markuplint/ml-core';

import meta from './meta.js';

/**
 * parse5 ERR codes for malformed character references — the eight codes
 * this rule claims responsibility for via `meta.mirrorsParseErrorCodes`.
 * Kept as a Set for O(1) lookup against `document.parseErrors`.
 */
const parse5CharacterReferenceCodes = new Set<string>([
	'unknown-named-character-reference',
	'missing-semicolon-after-character-reference',
	'absence-of-digits-in-numeric-character-reference',
	'null-character-reference',
	'surrogate-character-reference',
	'control-character-reference',
	'noncharacter-character-reference',
	'character-reference-outside-unicode-range',
]);

export default createRule({
	meta: meta,
	verify({ document, report, t }) {
		// Hook into parse5's malformed-character-reference events surfaced on
		// `document.parseErrors`. These eight codes — declared in
		// `meta.mirrorsParseErrorCodes` — are suppressed on the built-in
		// `parse-error` channel by ml-core, so this rule is the only place a
		// user with this rule enabled will see them.
		for (const pe of document.parseErrors) {
			if (!parse5CharacterReferenceCodes.has(pe.code)) {
				continue;
			}
			report({
				line: pe.startLine,
				col: pe.startCol,
				raw: pe.raw,
				message: t('{0} is {1:c}', t('the {0}', 'character reference'), pe.code),
			});
		}
	},
});
