import { createRule } from '@markuplint/ml-core';

import meta from './meta.js';

/**
 * Per HTML LS § Parse an import map string, only `imports`, `scopes`, and
 * `integrity` are recognised top-level keys. Other keys trigger a warning;
 * we report them as violations so authors can drop dead configuration.
 *
 * When HTML LS adds a new top-level key, update three places: this set,
 * the "not allowed" message string below, and the rule README table.
 *
 * @see https://html.spec.whatwg.org/multipage/webappapis.html#parse-an-import-map-string
 */
const ALLOWED_TOP_LEVEL_KEYS = new Set(['imports', 'scopes', 'integrity']);

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Resolve a URL-like module specifier per HTML LS. Returns `true` if the
 * specifier either starts with one of `/`, `./`, `../` (resolvable against
 * a base URL) or parses as an absolute URL on its own.
 *
 * @see https://html.spec.whatwg.org/multipage/webappapis.html#resolving-a-url-like-module-specifier
 */
function resolvesAsURLLikeSpecifier(specifier: string): boolean {
	if (specifier.startsWith('/') || specifier.startsWith('./') || specifier.startsWith('../')) {
		return true;
	}
	try {
		new URL(specifier);
		return true;
	} catch (error: unknown) {
		if (error instanceof TypeError) {
			return false;
		}
		throw error;
	}
}

export default createRule<boolean, null>({
	meta: meta,
	defaultValue: true,
	defaultOptions: null,
	async verify({ document, report, t }) {
		// markuplint's HTML parser does not retain raw text children of `<script>`
		// (the content is JavaScript, not HTML, so the AST drops it). To inspect
		// the inline body we extract the slice of the document source between the
		// open tag's end and the close tag's start.
		const sourceCode = (document as unknown as { readonly raw: string }).raw;

		await document.walkOn('Element', el => {
			if (el.localName !== 'script') return;
			// Dispatch by `type` value. Add a sibling branch for each new content
			// format and a matching `verifyXxx()` helper. Keep the README
			// "Currently supported content formats" table in sync.
			const typeAttr = el.getAttribute('type')?.toLowerCase();
			if (typeAttr !== 'importmap' && typeAttr !== 'speculationrules') return;
			if (el.pretenderContext?.type === 'pretender' && !el.hasAttribute('as')) return;
			if (!el.closeTag) return;

			const rawContent = sourceCode.slice(el.endOffset, el.closeTag.startOffset);
			const trimmed = rawContent.trim();

			const label = typeAttr === 'importmap' ? 'Import map' : 'Speculation rules';

			const reportAt = (message: string) => {
				report({
					scope: el,
					line: el.startLine,
					col: el.startCol,
					raw: el.raw,
					message: message,
				});
			};

			if (trimmed === '') {
				reportAt(t('{0} must contain a JSON object', label));
				return;
			}

			let parsed: unknown;
			try {
				parsed = JSON.parse(trimmed);
			} catch (error: unknown) {
				if (!(error instanceof SyntaxError)) {
					throw error;
				}
				reportAt(t('{0} must be valid JSON', label));
				return;
			}

			if (!isPlainObject(parsed)) {
				reportAt(t('{0} must be a JSON object', label));
				return;
			}

			if (typeAttr === 'importmap') {
				verifyImportMap(parsed, reportAt, t);
			} else {
				verifySpeculationRules(parsed, reportAt, t);
			}
		});
	},
});

function verifyImportMap(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	parsed: Record<string, unknown>,
	reportAt: (message: string) => void,
	t: (...args: readonly any[]) => string,
): void {
	for (const key of Object.keys(parsed)) {
		if (!ALLOWED_TOP_LEVEL_KEYS.has(key)) {
			reportAt(
				t(
					'{0} is {1:c}',
					t('the import map top-level key "{0*}"', key),
					'not allowed (use "imports", "scopes", or "integrity")',
				),
			);
		}
	}

	const imports = parsed.imports;
	if (imports !== undefined) {
		if (isPlainObject(imports)) {
			validateSpecifierMap(imports, 'imports', reportAt, t);
		} else {
			reportAt(t('{0} must be {1}', t('the "{0*}" top-level key of an import map', 'imports'), 'a JSON object'));
		}
	}

	const scopes = parsed.scopes;
	if (scopes !== undefined) {
		if (isPlainObject(scopes)) {
			for (const [scopeKey, scopeValue] of Object.entries(scopes)) {
				if (isPlainObject(scopeValue)) {
					validateSpecifierMap(scopeValue, `scopes["${scopeKey}"]`, reportAt, t);
				} else {
					reportAt(t('{0} must be {1}', t('the value of the scope "{0*}"', scopeKey), 'a JSON object'));
				}
			}
		} else {
			reportAt(t('{0} must be {1}', t('the "{0*}" top-level key of an import map', 'scopes'), 'a JSON object'));
		}
	}

	const integrity = parsed.integrity;
	if (integrity !== undefined) {
		if (isPlainObject(integrity)) {
			validateIntegrityMap(integrity, reportAt, t);
		} else {
			reportAt(
				t('{0} must be {1}', t('the "{0*}" top-level key of an import map', 'integrity'), 'a JSON object'),
			);
		}
	}
}

/**
 * Validate the body of a `<script type="speculationrules">` element.
 *
 * Spec status: Speculation Rules is now part of the HTML Living Standard
 * (§7.6 Speculation rules; the "parse a speculation rule" algorithm is §7.6.1.2).
 * It originated as the WICG `nav-speculation` draft, which is now a stub that
 * redirects to the HTML Standard — check the HTML Standard for the latest schema.
 *
 * markuplint also mirrors nu-validator's strictness (e.g. unknown keys, empty
 * `urls`, exactly-one `where` predicate) so the two agree on the conformance
 * corpus. When the spec changes, update this set/the SR_* sets below, the error
 * message strings, and the README tables.
 *
 * @see https://html.spec.whatwg.org/multipage/speculative-loading.html
 */
// Valid keys per HTML LS § 7.6.1.2 "parse a speculation rule" / the rule-set
// object grammar. Unknown keys are rejected by the spec (the rule returns null),
// so reporting them is conformant. We accept the full key set to avoid flagging
// valid rules that use fields beyond the common `source`/`urls`/`where` —
// value-level validation of the extra fields is intentionally not implemented.
const SR_TOP_LEVEL_KEYS = new Set(['tag', 'prefetch', 'prerender']);
const SR_RULE_KEYS = new Set([
	'source',
	'urls',
	'where',
	'relative_to',
	'eagerness',
	'referrer_policy',
	'tag',
	'requires',
	'expects_no_vary_search',
	'target_hint',
]);
const SR_SOURCES = new Set(['list', 'document']);
const SR_EAGERNESS = new Set(['immediate', 'eager', 'moderate', 'conservative']);
const SR_PREDICATE_KEYS = new Set(['and', 'or', 'not', 'href_matches', 'selector_matches']);

function verifySpeculationRules(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	parsed: Record<string, unknown>,
	reportAt: (message: string) => void,
	t: (...args: readonly any[]) => string,
): void {
	let hasRuleSet = false;
	for (const key of Object.keys(parsed)) {
		if (!SR_TOP_LEVEL_KEYS.has(key)) {
			reportAt(
				t(
					'{0} is {1:c}',
					t('the speculation rules top-level key "{0*}"', key),
					'not allowed (use "tag", "prefetch", or "prerender")',
				),
			);
			continue;
		}
		// `tag` is a ruleset label, not a list of rules; it does not satisfy the
		// "needs prefetch or prerender" requirement and is not an array of rules.
		if (key === 'tag') continue;
		hasRuleSet = true;
		const ruleSet = parsed[key];
		if (!Array.isArray(ruleSet)) {
			reportAt(t('{0} must be {1}', t('the "{0*}" property of speculation rules', key), 'a JSON array'));
			continue;
		}
		for (let i = 0; i < ruleSet.length; i++) {
			validateSpeculationRule(ruleSet[i], `${key}[${i}]`, reportAt, t);
		}
	}
	if (!hasRuleSet) {
		reportAt(t('{0} must be {1}', 'Speculation rules', 'an object with a "prefetch" or "prerender" property'));
	}
}

function validateSpeculationRule(
	rule: unknown,
	label: string,
	reportAt: (message: string) => void,
	t: (...args: readonly any[]) => string,
): void {
	if (!isPlainObject(rule)) {
		reportAt(t('{0} must be {1}', t('the speculation rule {0*}', label), 'a JSON object'));
		return;
	}

	for (const key of Object.keys(rule)) {
		if (!SR_RULE_KEYS.has(key)) {
			reportAt(
				t(
					'{0} is {1:c}',
					t('the speculation rule key "{0*}"', key),
					'not allowed (use "source", "urls", "where", "relative_to", "eagerness", "referrer_policy", "tag", "requires", "expects_no_vary_search", or "target_hint")',
				),
			);
		}
	}

	const sourceProvided = rule.source !== undefined;
	let validSource: 'list' | 'document' | undefined;
	if (sourceProvided) {
		if (typeof rule.source !== 'string') {
			reportAt(t('{0} must be {1}', t('the "source" of {0*}', label), 'a string'));
		} else if (SR_SOURCES.has(rule.source)) {
			validSource = rule.source as 'list' | 'document';
		} else {
			reportAt(
				t(
					'{0} is {1:c}',
					t('the "source" value "{0*}"', rule.source),
					'not allowed (use "list" or "document")',
				),
			);
		}
	}

	if (rule.eagerness !== undefined) {
		if (typeof rule.eagerness !== 'string') {
			reportAt(t('{0} must be {1}', t('the "eagerness" of {0*}', label), 'a string'));
		} else if (!SR_EAGERNESS.has(rule.eagerness)) {
			reportAt(
				t(
					'{0} is {1:c}',
					t('the "eagerness" value "{0*}"', rule.eagerness),
					'not allowed (use "immediate", "eager", "moderate", or "conservative")',
				),
			);
		}
	}

	const hasUrls = rule.urls !== undefined;
	if (hasUrls) {
		validateUrls(rule.urls, label, reportAt, t);
	}

	const hasWhere = rule.where !== undefined;
	if (hasWhere) {
		validatePredicate(rule.where, t('the "where" condition of {0*}', label), reportAt, t);
	}

	// Resolve the effective source: an explicit valid `source`, otherwise
	// inferred from exactly one of `urls` (→ list) or `where` (→ document) being
	// present. Per spec the inference is mutually exclusive: when neither or both
	// are present (and no explicit source), the source cannot be inferred and the
	// rule is invalid.
	let effectiveSource = validSource;
	if (effectiveSource === undefined && !sourceProvided) {
		if (hasUrls && !hasWhere) {
			effectiveSource = 'list';
		} else if (hasWhere && !hasUrls) {
			effectiveSource = 'document';
		}
	}

	if (effectiveSource === 'list') {
		if (!hasUrls) {
			reportAt(t('{0} must have {1}', t('the list rule {0*}', label), 'a "urls" property'));
		}
		if (hasWhere) {
			reportAt(t('{0} must not have {1}', t('the list rule {0*}', label), 'a "where" property'));
		}
	} else if (effectiveSource === 'document') {
		if (!hasWhere) {
			reportAt(t('{0} must have {1}', t('the document rule {0*}', label), 'a "where" property'));
		}
		if (hasUrls) {
			reportAt(t('{0} must not have {1}', t('the document rule {0*}', label), 'a "urls" property'));
		}
	} else if (!sourceProvided) {
		// No explicit source and inference failed (neither `urls`/`where`, or both).
		reportAt(
			t(
				'{0} must have {1}',
				t('the speculation rule {0*}', label),
				'a "source", or exactly one of "urls" or "where"',
			),
		);
	}
}

function validateUrls(
	urls: unknown,
	label: string,
	reportAt: (message: string) => void,
	t: (...args: readonly any[]) => string,
): void {
	if (!Array.isArray(urls)) {
		reportAt(t('{0} must be {1}', t('the "urls" of {0*}', label), 'a JSON array'));
		return;
	}
	if (urls.length === 0) {
		reportAt(t('{0} must not be {1}', t('the "urls" of {0*}', label), 'empty'));
		return;
	}
	for (let i = 0; i < urls.length; i++) {
		const url = urls[i];
		if (typeof url !== 'string') {
			reportAt(t('{0} must be {1}', t('the URL at index {0*} in "urls"', i), 'a string'));
		} else if (url === '') {
			reportAt(t('{0} must not be {1}', t('the URL at index {0*} in "urls"', i), 'empty'));
		}
	}
}

/**
 * Validate a document-rule `where` predicate. A predicate object must contain
 * exactly one of `and` / `or` / `not` / `href_matches` / `selector_matches`.
 *
 * @see https://wicg.github.io/nav-speculation/speculation-rules.html#document-rule-predicates
 */
function validatePredicate(
	predicate: unknown,
	label: string,
	reportAt: (message: string) => void,
	t: (...args: readonly any[]) => string,
): void {
	if (!isPlainObject(predicate)) {
		reportAt(t('{0} must be {1}', label, 'a JSON object'));
		return;
	}

	const keys = Object.keys(predicate);
	const predicateKeys: string[] = [];
	for (const key of keys) {
		if (SR_PREDICATE_KEYS.has(key)) {
			predicateKeys.push(key);
		} else {
			reportAt(
				t(
					'{0} is {1:c}',
					t('the predicate key "{0*}"', key),
					'not allowed (use "and", "or", "not", "href_matches", or "selector_matches")',
				),
			);
		}
	}

	if (predicateKeys.length === 0) {
		if (keys.length === 0) {
			reportAt(
				t(
					'{0} must have {1}',
					label,
					'exactly one predicate ("and", "or", "not", "href_matches", or "selector_matches")',
				),
			);
		}
		return;
	}
	if (predicateKeys.length > 1) {
		reportAt(t('{0} must have {1}', label, 'exactly one predicate, but has multiple'));
	}

	for (const key of predicateKeys) {
		const value = predicate[key];
		if (key === 'and' || key === 'or') {
			if (!Array.isArray(value)) {
				reportAt(t('{0} must be {1}', t('the "{0*}" predicate', key), 'a JSON array'));
				continue;
			}
			if (value.length === 0) {
				reportAt(t('{0} must not be {1}', t('the "{0*}" predicate', key), 'empty'));
				continue;
			}
			for (let i = 0; i < value.length; i++) {
				validatePredicate(value[i], t('the "{0*}" predicate item [{1*}]', key, i), reportAt, t);
			}
		} else if (key === 'not') {
			validatePredicate(value, t('the "not" predicate'), reportAt, t);
		} else {
			validatePatternValue(value, key, reportAt, t);
		}
	}
}

function validatePatternValue(
	value: unknown,
	key: string,
	reportAt: (message: string) => void,
	t: (...args: readonly any[]) => string,
): void {
	if (typeof value === 'string') {
		if (value === '') {
			reportAt(t('{0} must not be {1}', t('the "{0*}" pattern', key), 'empty'));
		}
		return;
	}
	if (Array.isArray(value)) {
		if (value.length === 0) {
			reportAt(t('{0} must not be {1}', t('the "{0*}" pattern', key), 'empty'));
			return;
		}
		for (let i = 0; i < value.length; i++) {
			const item = value[i];
			if (typeof item !== 'string') {
				reportAt(t('{0} must be {1}', t('item [{0*}] of the "{1*}" pattern', i, key), 'a string'));
			} else if (item === '') {
				reportAt(t('{0} must not be {1}', t('item [{0*}] of the "{1*}" pattern', i, key), 'empty'));
			}
		}
		return;
	}
	reportAt(t('{0} must be {1}', t('the "{0*}" pattern', key), 'a string or an array of strings'));
}

/**
 * Per HTML LS § normalizing a module integrity map, each entry's key is
 * resolved as a URL-like module specifier (warning if null) and the value
 * must be a string (warning if not). Unlike specifier maps, there is no
 * slash-suffix invariant — values are SRI hashes, not URLs.
 *
 * @see https://html.spec.whatwg.org/multipage/webappapis.html#normalizing-a-module-integrity-map
 */
function validateIntegrityMap(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	map: Record<string, unknown>,
	reportAt: (message: string) => void,
	t: (...args: readonly any[]) => string,
): void {
	for (const [key, value] of Object.entries(map)) {
		if (!resolvesAsURLLikeSpecifier(key)) {
			reportAt(
				t(
					'{0} must be {1}',
					t('the integrity key "{0*}"', key),
					'a URL-like specifier (starts with "/", "./", "../", or is an absolute URL)',
				),
			);
			continue;
		}
		if (typeof value !== 'string') {
			reportAt(t('{0} must be {1}', t('the value of "{0*}" in "integrity"', key), 'a string'));
		}
	}
}

function validateSpecifierMap(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	map: Record<string, unknown>,
	mapLabel: string,
	reportAt: (message: string) => void,
	t: (...args: readonly any[]) => string,
): void {
	for (const [key, value] of Object.entries(map)) {
		if (key === '') {
			reportAt(t('{0} must not be {1}', t('the specifier key in "{0*}"', mapLabel), 'empty'));
			continue;
		}
		if (typeof value !== 'string') {
			reportAt(t('{0} must be {1}', t('the value of "{0*}" in "{1*}"', key, mapLabel), 'a string'));
			continue;
		}
		if (!resolvesAsURLLikeSpecifier(value)) {
			reportAt(
				t(
					'{0} must be {1}',
					t('the address "{0*}" of "{1*}" in "{2*}"', value, key, mapLabel),
					'a URL-like specifier (starts with "/", "./", "../", or is an absolute URL)',
				),
			);
			continue;
		}
		if (key.endsWith('/') && !value.endsWith('/')) {
			reportAt(
				t(
					'{0} ends with "/" so {1} must end with "/" as well',
					t('the specifier key "{0*}" in "{1*}"', key, mapLabel),
					t('the address "{0*}"', value),
				),
			);
		}
	}
}
