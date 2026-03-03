/**
 * @module import-resolver
 *
 * Import analysis module that extracts import statements from `<script>` /
 * frontmatter / ESM blocks in component files, linking template component
 * usage to source file locations.
 *
 * Uses es-module-lexer (WASM-based) to identify import specifiers, then
 * supplements with regex parsing on statement slices to extract local names.
 *
 * Supports:
 * - Vue `<script setup>` (static imports)
 * - Vue Options API `components` property registration (fallback when no `<script setup>`)
 * - Svelte `<script>` tags
 * - Astro frontmatter (`---...---`)
 * - MDX top-level ESM
 * - Dynamic imports with string literal specifiers (`import('./path')`)
 * - Barrel file re-export resolution (single-level, via `resolveBarrelExport`)
 *
 * Excludes:
 * - `import.meta` references
 * - Dynamic imports with template literals or variable specifiers
 * - Multi-level barrel chains (only single-level re-exports are resolved)
 *
 * Note: The current implementation uses regex-based source extraction.
 * When the CLI multi-framework dispatch (#3340) creates a unified parsing
 * pipeline, MLAST psblock-based extraction can be integrated by parsing
 * the file once and passing the document to both templateScanner and
 * import-resolver.
 */

import type { ImportBinding, ImportAnalysisResult } from './types.js';

import path from 'node:path';

import {
	extractVueScriptSetup,
	extractVueScript,
	extractVueOptionsApiComponents,
	extractSvelteScript,
	extractAstroFrontmatter,
	extractMdxEsm,
} from './extract-script-source.js';
import { parseImports } from './parse-imports.js';
export { resolveBarrelExport } from './resolve-barrel.js';

export type { ImportBinding, ImportAnalysisResult } from './types.js';

/**
 * Supported framework types for import analysis.
 * Superset of templateScanner's framework types — includes MDX which
 * is a component usage site (not definition), making it relevant
 * for import analysis but not for template scanning.
 */
type ImportFrameworkType = 'vue' | 'svelte' | 'astro' | 'mdx';

const EXTENSION_MAP: Record<string, ImportFrameworkType> = {
	'.vue': 'vue',
	'.svelte': 'svelte',
	'.astro': 'astro',
	'.mdx': 'mdx',
};

/**
 * Determines the framework type from the file extension.
 * Local to import-resolver to include MDX without affecting templateScanner.
 */
function getImportFrameworkType(filePath: string): ImportFrameworkType | null {
	const ext = path.extname(filePath).toLowerCase();
	return EXTENSION_MAP[ext] ?? null;
}

/**
 * Analyzes a component file's source text and extracts all static import bindings.
 * Automatically detects the framework type from the file extension and extracts
 * the appropriate source block (script setup, script, frontmatter, or top-level ESM).
 *
 * @param filePath - The absolute or relative file path (used for framework detection)
 * @param source - The full source text of the component file
 * @returns The analysis result with all import bindings, or `null` if the framework
 *          is not supported or no relevant script block is found
 */
export async function analyzeImports(filePath: string, source: string): Promise<ImportAnalysisResult | null> {
	const framework = getImportFrameworkType(filePath);
	if (!framework) {
		return null;
	}

	let scriptSource: { content: string; offset: number } | null = null;

	switch (framework) {
		case 'vue': {
			scriptSource = extractVueScriptSetup(source);
			if (!scriptSource) {
				// Fallback to Vue Options API: extract regular <script>, parse imports,
				// then filter to only those registered in the `components` property.
				return analyzeVueOptionsApi(source);
			}
			break;
		}
		case 'svelte': {
			scriptSource = extractSvelteScript(source);
			break;
		}
		case 'astro': {
			scriptSource = extractAstroFrontmatter(source);
			break;
		}
		case 'mdx': {
			scriptSource = extractMdxEsm(source);
			break;
		}
	}

	if (!scriptSource) {
		return { bindings: [] };
	}

	const bindings = await parseImports(scriptSource.content);
	return { bindings };
}

/**
 * Analyzes a Vue SFC's regular `<script>` block for Options API component registration.
 * Parses all imports from the script block, then filters to only those whose
 * local name appears in the `components: { ... }` property.
 *
 * @param source - The full Vue SFC source text
 * @returns The analysis result with filtered bindings, or empty bindings if not applicable
 */
async function analyzeVueOptionsApi(source: string): Promise<ImportAnalysisResult> {
	const scriptBlock = extractVueScript(source);
	if (!scriptBlock) {
		return { bindings: [] };
	}

	const allBindings = await parseImports(scriptBlock.content);
	const componentNames = extractVueOptionsApiComponents(scriptBlock.content);

	if (componentNames.length === 0) {
		return { bindings: [] };
	}

	const componentNameSet = new Set(componentNames);
	const bindings = allBindings.filter(b => componentNameSet.has(b.localName));
	return { bindings };
}

/**
 * Resolves a component name used in a template to its import source path.
 * For Vue, handles both PascalCase (`<MyButton>`) and kebab-case (`<my-button>`)
 * representations of the same component by normalizing to PascalCase for lookup.
 *
 * @param componentName - The component name as used in the template
 * @param bindings - The import bindings extracted from the script block
 * @returns The matching import binding, or `undefined` if no match is found
 */
export function resolveComponentImport(
	componentName: string,
	bindings: readonly ImportBinding[],
): ImportBinding | undefined {
	// Direct match
	const direct = bindings.find(b => b.localName === componentName);
	if (direct) {
		return direct;
	}

	// Vue kebab-case → PascalCase normalization
	const pascalName = kebabToPascalCase(componentName);
	if (pascalName !== componentName) {
		return bindings.find(b => b.localName === pascalName);
	}

	return undefined;
}

/**
 * Converts a kebab-case string to PascalCase.
 * Used for Vue's component name resolution where `<my-button>` maps to `MyButton`.
 *
 * @param str - The kebab-case string
 * @returns The PascalCase equivalent
 */
function kebabToPascalCase(str: string): string {
	if (!str.includes('-')) {
		return str;
	}
	return str
		.split('-')
		.map(part => (part.length > 0 ? part[0]!.toUpperCase() + part.slice(1) : ''))
		.join('');
}
