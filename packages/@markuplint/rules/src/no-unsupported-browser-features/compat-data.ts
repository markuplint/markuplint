import type {
	BrowserName,
	CompatData,
	Identifier,
	SimpleSupportStatement,
	SupportStatement,
} from '@mdn/browser-compat-data';

/**
 * Target browser with name and minimum version.
 */
export interface TargetBrowser {
	readonly browser: BrowserName;
	readonly version: string;
	readonly displayName: string;
}

/**
 * Result of checking browser support for a feature.
 */
export interface UnsupportedResult {
	readonly browser: BrowserName;
	readonly displayName: string;
	readonly targetVersion: string;
	readonly addedVersion: string | false;
	readonly removedVersion?: string;
}

/**
 * Mapping from browserslist browser names to BCD browser names.
 */
const BROWSERSLIST_TO_BCD: ReadonlyMap<string, BrowserName> = new Map([
	['chrome', 'chrome'],
	['firefox', 'firefox'],
	['safari', 'safari'],
	['edge', 'edge'],
	['ie', 'ie'],
	['opera', 'opera'],
	['and_chr', 'chrome_android'],
	['and_ff', 'firefox_android'],
	['ios_saf', 'safari_ios'],
	['samsung', 'samsunginternet_android'],
	['op_mob', 'opera_android'],
	['android', 'webview_android'],
]);

let bcdPromise: Promise<CompatData> | undefined;

/**
 * Dynamically import @mdn/browser-compat-data.
 *
 * This uses dynamic import because BCD's main entry points to a ~70MB JSON
 * file. Static import would force every markuplint user to parse that JSON
 * at startup, even when this rule is disabled. Dynamic import defers the
 * cost until the rule actually runs.
 *
 * Uses `forLegacyNode` to avoid `ERR_IMPORT_ATTRIBUTE_MISSING` on Node.js >= 22.
 * The main entry (`@mdn/browser-compat-data`) points directly to `data.json`,
 * which requires `import ... with { type: "json" }` on Node.js >= 22.
 * The `forLegacyNode` wrapper uses `fs.readFileSync` instead, compatible
 * with all Node.js versions.
 *
 * NOTE: If `forLegacyNode` is removed in a future BCD version, migrate to:
 *   `import('...', { with: { type: 'json' } })`
 * once the minimum supported Node.js version supports import attributes.
 *
 * Uses a Promise-based cache to prevent race conditions when multiple
 * concurrent calls trigger the import simultaneously.
 */

function loadBcd(): Promise<CompatData> {
	if (!bcdPromise) {
		// `?? mod` is a defensive fallback for CJS interop environments
		// where `default` may not be set on the module namespace object.
		bcdPromise = import('@mdn/browser-compat-data/forLegacyNode').then(mod => mod.default ?? mod);
	}
	return bcdPromise;
}

/**
 * Convert a browserslist browser name to a BCD browser name.
 *
 * @param browserslistName - The browser name from browserslist (e.g., "and_chr")
 * @returns The corresponding BCD browser name, or null if unknown
 */
export function toBcdBrowserId(browserslistName: string): BrowserName | null {
	return BROWSERSLIST_TO_BCD.get(browserslistName) ?? null;
}

/**
 * Parse a version string into a comparable numeric tuple.
 *
 * Handles BCD version prefixes like "≤37" by stripping the prefix.
 *
 * @param version - Version string (e.g., "16.4", "≤37", "preview")
 * @returns Tuple of [major, minor, patch]
 */
export function parseVersion(version: string): readonly [number, number, number] {
	const cleaned = version.replace(/^≤/, '');
	const parts = cleaned.split('.').map(Number);
	return [parts[0] ?? Number.NaN, parts[1] ?? 0, parts[2] ?? 0];
}

/**
 * Check if the target browser version satisfies the required version.
 *
 * Returns true if the target version is greater than or equal to the
 * version the feature was added in.
 *
 * @param targetVersion - The browser version the user targets
 * @param addedVersion - The version the feature was added in
 * @returns Whether the target version supports the feature
 */
export function isVersionSatisfied(targetVersion: string, addedVersion: string): boolean {
	const [tMajor, tMinor, tPatch] = parseVersion(targetVersion);
	const [aMajor, aMinor, aPatch] = parseVersion(addedVersion);

	if (Number.isNaN(tMajor) || Number.isNaN(aMajor)) {
		return true;
	}

	if (tMajor !== aMajor) {
		return tMajor > aMajor;
	}
	if (tMinor !== aMinor) {
		return tMinor > aMinor;
	}
	return tPatch >= aPatch;
}

/**
 * Get the standard (non-flagged, non-prefixed) support statement
 * from a SupportStatement which may be an array.
 */
function getStandardSupport(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	support: SupportStatement,
): SimpleSupportStatement | null {
	if (Array.isArray(support)) {
		const standard = support.find(s => !s.flags && !s.prefix && !s.alternative_name);
		return standard ?? null;
	}
	if (support.flags || support.prefix || support.alternative_name) {
		return null;
	}
	return support;
}

/**
 * Check if a feature is supported by a specific browser version.
 *
 * @param support - The BCD support statement for the feature
 * @param target - The target browser to check
 * @returns null if supported or unknown, UnsupportedResult if not supported
 */
export function checkSupport(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	support: SupportStatement | undefined,

	target: TargetBrowser,
): UnsupportedResult | null {
	if (!support) {
		return null;
	}

	const stmt = getStandardSupport(support);
	if (!stmt) {
		return null;
	}

	const { version_added, version_removed } = stmt;

	if (version_added === false) {
		return {
			browser: target.browser,
			displayName: target.displayName,
			targetVersion: target.version,
			addedVersion: false,
		};
	}

	if (!isVersionSatisfied(target.version, version_added)) {
		return {
			browser: target.browser,
			displayName: target.displayName,
			targetVersion: target.version,
			addedVersion: version_added,
		};
	}

	// Feature was added but later removed
	if (version_removed != null && isVersionSatisfied(target.version, version_removed)) {
		return {
			browser: target.browser,
			displayName: target.displayName,
			targetVersion: target.version,
			addedVersion: false,
			removedVersion: version_removed,
		};
	}

	return null;
}

/**
 * Look up the BCD identifier for an HTML element.
 */
async function getElementIdentifier(elementName: string): Promise<Identifier | null> {
	const bcd = await loadBcd();
	const elements = bcd.html.elements;
	if (!elements) {
		return null;
	}
	const el = elements[elementName] as Identifier | undefined;
	return el ?? null;
}

/**
 * Check browser support for an HTML element.
 *
 * @param elementName - The HTML element name (e.g., "dialog")
 * @param targets - Array of target browsers to check
 * @returns Array of unsupported results (empty if all supported)
 */

export async function checkElementSupport(
	elementName: string,
	targets: readonly TargetBrowser[],
): Promise<readonly UnsupportedResult[]> {
	const identifier = await getElementIdentifier(elementName);
	if (!identifier?.__compat) {
		return [];
	}

	const results: UnsupportedResult[] = [];
	for (const target of targets) {
		const support = identifier.__compat.support[target.browser];
		const result = checkSupport(support, target);
		if (result) {
			results.push(result);
		}
	}
	return results;
}

/**
 * Check browser support for an HTML attribute on a specific element.
 *
 * @param elementName - The HTML element name (e.g., "input")
 * @param attrName - The attribute name (e.g., "list")
 * @param targets - Array of target browsers to check
 * @returns Array of unsupported results (empty if all supported)
 */

export async function checkAttributeSupport(
	elementName: string,
	attrName: string,
	targets: readonly TargetBrowser[],
): Promise<readonly UnsupportedResult[]> {
	const identifier = await getElementIdentifier(elementName);
	if (!identifier) {
		return [];
	}

	const attrIdentifier = identifier[attrName] as Identifier | undefined;
	if (!attrIdentifier?.__compat) {
		return [];
	}

	const results: UnsupportedResult[] = [];
	for (const target of targets) {
		const support = attrIdentifier.__compat.support[target.browser];
		const result = checkSupport(support, target);
		if (result) {
			results.push(result);
		}
	}
	return results;
}
