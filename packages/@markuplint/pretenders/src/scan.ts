import type { Pretender } from '@markuplint/ml-config';

import { propSort } from './dependency-mapper.js';
import { jsxScanner } from './jsx/index.js';
import { templateScanner } from './template/index.js';

/**
 * Options for the unified {@link scan} function.
 */
export interface ScanOptions {
	/** Component names to exclude from scanning results */
	readonly ignoreComponentNames?: readonly string[];

	/**
	 * In-memory content overrides, keyed by normalized (`/`-delimited)
	 * absolute file path, consulted before falling back to a disk read.
	 */
	readonly sources?: ReadonlyMap<string, string>;
}

/**
 * Dispatches files to the appropriate scanner based on file extension,
 * runs both scanners in parallel, and merges + sorts the results.
 *
 * - `.js`, `.jsx`, `.ts`, `.tsx` → {@link jsxScanner}
 * - `.vue`, `.svelte`, `.astro` → {@link templateScanner} (delegates to parser component-scanners)
 *
 * @param files - Absolute file paths to scan
 * @param options - Optional scan configuration
 * @returns All discovered pretender mappings, sorted by selector
 */
export async function scan(files: readonly string[], options?: ScanOptions): Promise<Pretender[]> {
	const jsxFiles = files.filter(filePath => /\.[jt]sx?$/.test(filePath));
	const templateFiles = files.filter(filePath => /\.(?:vue|svelte|astro)$/.test(filePath));

	const ignoreComponentNames = options?.ignoreComponentNames ? [...options.ignoreComponentNames] : undefined;
	const sources = options?.sources;

	const [jsxPretenders, templatePretenders] = await Promise.all([
		jsxFiles.length > 0 ? jsxScanner(jsxFiles, { ignoreComponentNames, sources }) : Promise.resolve([]),
		templateFiles.length > 0
			? templateScanner(templateFiles, { ignoreComponentNames, sources })
			: Promise.resolve([]),
	]);

	return [...jsxPretenders, ...templatePretenders].toSorted(propSort('selector'));
}
