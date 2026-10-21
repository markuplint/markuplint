import type { ComponentScanner } from './component-scanner.js';

import { isFatalError } from '@markuplint/shared';

const SCANNER_PACKAGES: Record<string, string> = {
	'.vue': '@markuplint/vue-parser/component-scanner',
	'.svelte': '@markuplint/svelte-parser/component-scanner',
	'.astro': '@markuplint/astro-parser/component-scanner',
};

const scannerCache = new Map<string, ComponentScanner | null>();

/**
 * The package of the parser of the language of a file, by its extension. Unlike {@link SCANNER_PACKAGES}
 * it holds the languages that have no scanner (JSX, MDX), as the name of a component is the rule of the
 * parser (`Parser#isComponentName` of `@markuplint/parser-utils`). The parser packages are
 * `optionalDependencies` of this package and are loaded dynamically, as the scanners are: this package
 * must not import them statically, so that one that is not installed only leaves its language to the
 * default rule.
 */
const PARSER_PACKAGES: Record<string, string> = {
	'.vue': '@markuplint/vue-parser',
	'.svelte': '@markuplint/svelte-parser',
	'.astro': '@markuplint/astro-parser',
	'.mdx': '@markuplint/mdx-parser',
	'.js': '@markuplint/jsx-parser',
	'.jsx': '@markuplint/jsx-parser',
	'.ts': '@markuplint/jsx-parser',
	'.tsx': '@markuplint/jsx-parser',
	'.mjs': '@markuplint/jsx-parser',
	'.cjs': '@markuplint/jsx-parser',
	'.mts': '@markuplint/jsx-parser',
	'.cts': '@markuplint/jsx-parser',
};

type NameRule = (name: string) => boolean;

/**
 * What this package asks of a parser: `Parser#isComponentName` of every one, and `isNativeTag` of
 * the parser of a language whose templates resolve a tag to a component unless it is a native one (Vue).
 */
type LoadedParser = {
	readonly isComponentName: NameRule;
	readonly isNativeTag?: NameRule;
};

/**
 * The load of the parser for each extension, kept as a promise so that the files analysed at the same
 * time share one import. It settles to `null` for an extension that has no parser, or whose parser
 * is not installed. A load that failed otherwise is dropped, so that it is tried again.
 */
const parserLoads = new Map<string, Promise<LoadedParser | null>>();

/** What the loads settled to: the sync reader of {@link getLoadedComponentNameRule}. */
const loadedParsers = new Map<string, LoadedParser>();

/** The extensions whose parser failed to load for a reason other than not being installed, and was warned of. */
const warnedFaults = new Set<string>();

async function importParser(ext: string): Promise<LoadedParser | null> {
	const pkg = PARSER_PACKAGES[ext];
	if (!pkg) {
		return null;
	}
	try {
		const mod: { parser: { isComponentName(name: string): boolean; isNativeTag?(name: string): boolean } } =
			await import(pkg);
		const { parser } = mod;
		return {
			isComponentName: name => parser.isComponentName(name),
			...(typeof parser.isNativeTag === 'function' ? { isNativeTag: name => parser.isNativeTag!(name) } : {}),
		};
	} catch (error: unknown) {
		if (isFatalError(error)) {
			throw error;
		}
		// A parser that is not installed is for the caller to do without: the scanner of the same package
		// has said so (`getScanner`), and a language with no scanner has no parser the user meant to use.
		// Only the parser package itself missing is that: a module the parser needs that is missing is a fault.
		if (isModuleNotFoundError(error) && error instanceof Error && missingPackageOf(error) === pkg) {
			return null;
		}
		// A fault may pass (a build that was not done yet), so it is not kept: the next call tries again, and
		// the warning is given once.
		parserLoads.delete(ext);
		if (!warnedFaults.has(ext)) {
			warnedFaults.add(ext);
			// eslint-disable-next-line no-console
			console.warn(`Failed to load the parser for ${ext}:`, error instanceof Error ? error.message : error);
		}
		return null;
	}
}

/**
 * Loads the rule that tells the name of a component from that of an element in the language of a file,
 * which is the parser's own. Without a parser to ask (an extension no parser reads, or a parser package
 * that is not installed) there is no rule, and {@link getLoadedComponentNameRule} says so.
 *
 * It is async, as the package is loaded dynamically; what reads the rule is sync, so
 * `analyzeImports`, which every binding comes from, calls it first.
 *
 * @param ext - The extension of the file, with the dot
 */
export async function loadComponentNameRule(ext: string): Promise<void> {
	let load = parserLoads.get(ext);
	if (!load) {
		load = importParser(ext);
		parserLoads.set(ext, load);
	}
	const parser = await load;
	if (parser) {
		loadedParsers.set(ext, parser);
	}
}

/**
 * The rule that {@link loadComponentNameRule} loaded for an extension, or `undefined` when it has not
 * been loaded or there is none.
 *
 * @param ext - The extension of the file, with the dot
 * @returns The rule, or `undefined`
 */
export function getLoadedComponentNameRule(ext: string): NameRule | undefined {
	return loadedParsers.get(ext)?.isComponentName;
}

/**
 * The `isNativeTag` of the parser that {@link loadComponentNameRule} loaded for an extension: whether a tag
 * name is a native element to the language, so that the template does not resolve it to a component. `undefined`
 * when it has not been loaded, or the parser has none.
 *
 * @param ext - The extension of the file, with the dot
 * @returns The rule, or `undefined`
 */
export function getLoadedNativeTagRule(ext: string): NameRule | undefined {
	return loadedParsers.get(ext)?.isNativeTag;
}

/**
 * The package that an `ERR_MODULE_NOT_FOUND` of Node names as missing: `Cannot find package '<name>'
 * imported from <path>`. The path is that of the module that imports it, which is inside the parser's own
 * package when a dependency of the parser is missing, so the message as a whole names the parser either way.
 *
 * @param error - The error of the import
 * @returns The name of the missing package, or `undefined` for another message (a missing file of a package)
 */
function missingPackageOf(error: Error): string | undefined {
	return /^Cannot find package '([^']+)'/.exec(error.message)?.[1];
}

function isModuleNotFoundError(error: unknown): boolean {
	return (
		error instanceof Error && 'code' in error && (error as NodeJS.ErrnoException).code === 'ERR_MODULE_NOT_FOUND'
	);
}

export async function getScanner(ext: string): Promise<ComponentScanner | null> {
	const cached = scannerCache.get(ext);
	if (cached !== undefined) {
		return cached;
	}

	const pkg = SCANNER_PACKAGES[ext];
	if (!pkg) {
		scannerCache.set(ext, null);
		return null;
	}

	try {
		const mod: { componentScanner: ComponentScanner } = await import(pkg);
		scannerCache.set(ext, mod.componentScanner);
		return mod.componentScanner;
	} catch (error: unknown) {
		if (isModuleNotFoundError(error)) {
			const parserPkg = pkg.replace('/component-scanner', '');
			// eslint-disable-next-line no-console
			console.warn(`Parser package "${parserPkg}" is not installed. Skipping ${ext} files.`);
		} else {
			// eslint-disable-next-line no-console
			console.warn(
				`Failed to load component scanner for ${ext}:`,
				error instanceof Error ? error.message : error,
			);
		}
		scannerCache.set(ext, null);
		return null;
	}
}
