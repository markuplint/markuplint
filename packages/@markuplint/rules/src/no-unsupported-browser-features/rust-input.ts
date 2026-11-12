import type { TargetBrowser } from './compat-data.js';
import type { BrowserName, Identifier } from '@mdn/browser-compat-data';

import { loadBcd } from './compat-data.js';
import { resolveTargetBrowsers } from './resolve-browsers.js';

/**
 * Input of the Rust engine's `no-unsupported-browser-features` in place of browserslist and BCD,
 * neither of which that engine has. The Rust side reads it as `BrowserSupport`
 * (`crates/markuplint-rules/src/rules/no_unsupported_browser_features/`), which is where the check
 * itself is: this module only resolves and extracts, so the decision of what is unsupported is
 * made in one place.
 *
 * BCD is not embedded in the binary: the data is the user's installed `@mdn/browser-compat-data`,
 * as for the TypeScript rule, so how new it is does not depend on the release of markuplint.
 */
export interface BrowserSupportInput {
	readonly targets: readonly TargetBrowser[];
	readonly elements: Readonly<Record<string, ElementCompat>>;
}

/**
 * One support statement of BCD. `flags`, `prefix` and `alternativeName` are kept only to tell a
 * statement that is not the standard one; their values are not needed.
 */
interface CompatStatement {
	readonly versionAdded: string | false;
	readonly versionRemoved?: string;
	readonly flags?: true;
	readonly prefix?: true;
	readonly alternativeName?: true;
}

/** The statements of a feature by BCD browser name, for the target browsers only. */
type CompatSupport = Readonly<Record<string, readonly CompatStatement[]>>;

/** `bcd.html.elements.<element>`: its own support and that of the attribute keys beneath it. */
interface ElementCompat {
	readonly compat?: CompatSupport;
	readonly attrs: Readonly<Record<string, CompatSupport>>;
}

const extractionCache = new Map<string, Promise<Readonly<Record<string, ElementCompat>>>>();

function extractSupport(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	identifier: Identifier,
	browsers: readonly BrowserName[],
): CompatSupport | undefined {
	const compat = identifier.__compat;
	if (!compat) {
		return;
	}
	const support: Record<string, CompatStatement[]> = {};
	for (const browser of browsers) {
		const raw = compat.support[browser];
		if (!raw) {
			continue;
		}
		const statements: CompatStatement[] = [];
		for (const s of Array.isArray(raw) ? raw : [raw]) {
			if (typeof s.version_added !== 'string' && s.version_added !== false) {
				continue;
			}
			statements.push({
				versionAdded: s.version_added,
				...(s.version_removed == null ? {} : { versionRemoved: s.version_removed as string }),
				...(s.flags ? { flags: true as const } : {}),
				...(s.prefix ? { prefix: true as const } : {}),
				...(s.alternative_name ? { alternativeName: true as const } : {}),
			});
		}
		if (statements.length > 0) {
			support[browser] = statements;
		}
	}
	return support;
}

/**
 * The part of `bcd.html.elements` that the check reads (`getElementIdentifier` and
 * `findAttrIdentifier` of `compat-data.ts`): each element, and the keys directly beneath it that
 * carry `__compat`, reduced to the statements of the target browsers. It is cached by the set of
 * browsers, so the 70MB of BCD is read once per process and not once per file.
 */
function extractCompat(browsers: readonly BrowserName[]): Promise<Readonly<Record<string, ElementCompat>>> {
	const key = [...new Set(browsers)].toSorted().join(',');
	let cached = extractionCache.get(key);
	if (!cached) {
		cached = loadBcd().then(bcd => {
			const result: Record<string, ElementCompat> = {};
			for (const [elName, identifier] of Object.entries(bcd.html.elements ?? {})) {
				const compat = extractSupport(identifier as Identifier, browsers);
				const attrs: Record<string, CompatSupport> = {};
				for (const [attrKey, attrIdentifier] of Object.entries(identifier)) {
					if (attrKey === '__compat') {
						continue;
					}
					const attrSupport = extractSupport(attrIdentifier as Identifier, browsers);
					if (attrSupport) {
						attrs[attrKey] = attrSupport;
					}
				}
				if (compat || Object.keys(attrs).length > 0) {
					result[elName] = { ...(compat ? { compat } : {}), attrs };
				}
			}
			return result;
		});
		extractionCache.set(key, cached);
	}
	return cached;
}

/**
 * Resolves the target browsers of a file as the rule does (`document.rule.options` and
 * `document.filename`, once per file) and extracts the BCD data they need.
 *
 * @param filename - The path of the file that is linted
 * @param options - The options of the rule at the global level
 * @returns `undefined` when no browserslist configuration applies, where the rule reports nothing
 */
export async function resolveBrowserSupportForRust(
	filename: string | undefined,
	options: {
		readonly browserslist?: string | readonly string[];
		readonly browserslistConfig?: string;
		readonly browserslistEnv?: string;
	},
): Promise<BrowserSupportInput | undefined> {
	const targets = resolveTargetBrowsers(filename, options);
	if (targets == null || targets.length === 0) {
		return;
	}
	return { targets, elements: await extractCompat(targets.map(t => t.browser)) };
}
