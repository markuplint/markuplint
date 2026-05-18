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
			// format (e.g. application/json, speculationrules) and a matching
			// `verifyXxx()` helper. Keep the README "Currently supported content
			// formats" table in sync.
			const typeAttr = el.getAttribute('type');
			if (typeAttr?.toLowerCase() !== 'importmap') return;
			if (el.pretenderContext?.type === 'pretender' && !el.hasAttribute('as')) return;
			if (!el.closeTag) return;

			const rawContent = sourceCode.slice(el.endOffset, el.closeTag.startOffset);
			const trimmed = rawContent.trim();

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
				reportAt(t('{0} must contain a JSON object', 'Import map'));
				return;
			}

			let parsed: unknown;
			try {
				parsed = JSON.parse(trimmed);
			} catch (error: unknown) {
				if (!(error instanceof SyntaxError)) {
					throw error;
				}
				reportAt(t('{0} must be valid JSON', 'Import map'));
				return;
			}

			if (!isPlainObject(parsed)) {
				reportAt(t('{0} must be a JSON object', 'Import map'));
				return;
			}

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
					reportAt(
						t(
							'{0} must be {1}',
							t('the "{0*}" top-level key of an import map', 'imports'),
							'a JSON object',
						),
					);
				}
			}

			const scopes = parsed.scopes;
			if (scopes !== undefined) {
				if (isPlainObject(scopes)) {
					for (const [scopeKey, scopeValue] of Object.entries(scopes)) {
						if (isPlainObject(scopeValue)) {
							validateSpecifierMap(scopeValue, `scopes["${scopeKey}"]`, reportAt, t);
						} else {
							reportAt(
								t('{0} must be {1}', t('the value of the scope "{0*}"', scopeKey), 'a JSON object'),
							);
						}
					}
				} else {
					reportAt(
						t('{0} must be {1}', t('the "{0*}" top-level key of an import map', 'scopes'), 'a JSON object'),
					);
				}
			}

			const integrity = parsed.integrity;
			if (integrity !== undefined) {
				if (isPlainObject(integrity)) {
					validateIntegrityMap(integrity, reportAt, t);
				} else {
					reportAt(
						t(
							'{0} must be {1}',
							t('the "{0*}" top-level key of an import map', 'integrity'),
							'a JSON object',
						),
					);
				}
			}
		});
	},
});

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
