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
 * Phase 1 supports:
 * - Vue `<script setup>` (direct static imports only)
 * - Svelte `<script>` tags
 * - Astro frontmatter (`---...---`)
 *
 * Phase 1 excludes:
 * - Vue Options API `components` property registration
 * - Dynamic imports (`import()`)
 * - `import.meta` references
 */

import type { ImportBinding, ImportAnalysisResult } from './types.js';

import { getFrameworkType } from '../template/parse-component.js';

import { extractVueScriptSetup, extractSvelteScript, extractAstroFrontmatter } from './extract-script-source.js';
import { parseImports } from './parse-imports.js';

export type { ImportBinding, ImportAnalysisResult } from './types.js';

/**
 * Analyzes a component file's source text and extracts all static import bindings.
 * Automatically detects the framework type from the file extension and extracts
 * the appropriate source block (script setup, script, or frontmatter).
 *
 * @param filePath - The absolute or relative file path (used for framework detection)
 * @param source - The full source text of the component file
 * @returns The analysis result with all import bindings, or `null` if the framework
 *          is not supported or no relevant script block is found
 */
export async function analyzeImports(filePath: string, source: string): Promise<ImportAnalysisResult | null> {
	const framework = getFrameworkType(filePath);
	if (!framework) {
		return null;
	}

	let scriptSource: { content: string; offset: number } | null = null;

	switch (framework) {
		case 'vue': {
			scriptSource = extractVueScriptSetup(source);
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
	}

	if (!scriptSource) {
		return { bindings: [] };
	}

	const bindings = await parseImports(scriptSource.content);
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
