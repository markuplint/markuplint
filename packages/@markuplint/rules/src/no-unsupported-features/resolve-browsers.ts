import type { BrowserName } from '@mdn/browser-compat-data';

import type { TargetBrowser } from './compat-data.js';

import browserslist from 'browserslist';

import { isVersionSatisfied, parseVersion, toBcdBrowserId } from './compat-data.js';

/**
 * Options for resolving target browsers.
 */
export interface BrowserslistOptions {
	readonly browserslist?: string | readonly string[];
	readonly browserslistConfig?: string;
	readonly browserslistEnv?: string;
}

/**
 * Display names for BCD browser identifiers.
 */
const BROWSER_DISPLAY_NAMES: ReadonlyMap<BrowserName, string> = new Map([
	['chrome', 'Chrome'],
	['chrome_android', 'Chrome Android'],
	['edge', 'Edge'],
	['firefox', 'Firefox'],
	['firefox_android', 'Firefox Android'],
	['ie', 'Internet Explorer'],
	['opera', 'Opera'],
	['opera_android', 'Opera Android'],
	['safari', 'Safari'],
	['safari_ios', 'Safari iOS'],
	['samsunginternet_android', 'Samsung Internet'],
	['webview_android', 'WebView Android'],
]);

const configCache = new Map<string, readonly TargetBrowser[] | null>();

/**
 * Resolve target browsers from browserslist configuration.
 *
 * Priority:
 * 1. `options.browserslist` (explicit query)
 * 2. `options.browserslistConfig` (explicit config file path)
 * 3. Auto-detect from `filename` path
 *
 * When no configuration is found, returns null (rule becomes no-op).
 * For duplicate browsers, the minimum version is kept.
 *
 * @param filename - The document filename for auto-detection
 * @param options - Browserslist resolution options
 * @returns Array of target browsers, or null if no config found
 */
export function resolveTargetBrowsers(
	filename: string | undefined,

	options: BrowserslistOptions,
): readonly TargetBrowser[] | null {
	if (options.browserslist != null) {
		const queries = Array.isArray(options.browserslist) ? options.browserslist : [options.browserslist];
		const cacheKey = `query:${queries.join(',')}`;
		if (configCache.has(cacheKey)) {
			return configCache.get(cacheKey) ?? null;
		}
		const result = parseBrowsersList(browserslist(queries));
		configCache.set(cacheKey, result);
		return result;
	}

	const configPath = options.browserslistConfig ?? filename;
	if (!configPath) {
		return null;
	}

	const env = options.browserslistEnv;
	const cacheKey = `path:${configPath}:${env ?? ''}`;
	if (configCache.has(cacheKey)) {
		return configCache.get(cacheKey) ?? null;
	}

	const config = browserslist.loadConfig({
		path: configPath,
		env,
		...(options.browserslistConfig ? { config: options.browserslistConfig } : {}),
	});

	if (!config) {
		configCache.set(cacheKey, null);
		return null;
	}

	const result = parseBrowsersList(browserslist(config));
	configCache.set(cacheKey, result);
	return result;
}

/**
 * Parse browserslist output into TargetBrowser array.
 *
 * For duplicate browsers, keeps the minimum version to ensure
 * compatibility with the widest range of target browsers.
 */
function parseBrowsersList(browsers: readonly string[]): readonly TargetBrowser[] | null {
	const browserMap = new Map<BrowserName, { version: string; displayName: string }>();

	for (const entry of browsers) {
		const parts = entry.split(' ');
		if (parts.length < 2) {
			continue;
		}
		const [name, rawVersion] = parts;
		if (!name || !rawVersion) {
			continue;
		}
		// Handle hyphenated version ranges (e.g., "16.3-16.4") by taking the minimum
		const version = rawVersion.includes('-') ? rawVersion.split('-')[0]! : rawVersion;

		const bcdId = toBcdBrowserId(name);
		if (!bcdId) {
			continue;
		}

		const existing = browserMap.get(bcdId);
		const displayName = BROWSER_DISPLAY_NAMES.get(bcdId) ?? name;

		if (existing) {
			// Keep minimum version — treat "preview" (NaN) as the highest possible version
			const [newMajor] = parseVersion(version);
			if (!Number.isNaN(newMajor)) {
				// New version is concrete — replace if existing is "preview" or new < existing
				const [existingMajor] = parseVersion(existing.version);
				if (Number.isNaN(existingMajor) || !isVersionSatisfied(version, existing.version)) {
					browserMap.set(bcdId, { version, displayName });
				}
			}
			// If new version is "preview", never replace (preview is the highest)
		} else {
			browserMap.set(bcdId, { version, displayName });
		}
	}

	if (browserMap.size === 0) {
		return null;
	}

	const result: TargetBrowser[] = [];
	for (const [browser, { version, displayName }] of browserMap) {
		result.push({ browser, version, displayName });
	}
	return result;
}

/**
 * Clear the internal browserslist config cache.
 * Useful for testing.
 */
export function clearBrowserslistCache(): void {
	configCache.clear();
}
