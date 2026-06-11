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
 * ## Supported frameworks
 *
 * - Vue `<script setup>` (via `@markuplint/vue-parser/component-scanner`)
 * - Vue Options API `components` property (fallback; uses built-in regex extraction)
 * - Svelte `<script>` tags (via `@markuplint/svelte-parser/component-scanner`)
 * - Astro frontmatter (via `@markuplint/astro-parser/component-scanner`)
 * - MDX top-level ESM (built-in extraction — no parser package)
 *
 * ## Dynamic imports
 *
 * Dynamic imports with string literal specifiers (`import('./path')`) are
 * included in the bindings with `type: 'dynamic'`. These bindings use
 * `localName: '*'` as a sentinel since dynamic imports have no local binding.
 * Template literal and variable specifiers are excluded.
 *
 * ## Barrel file resolution
 *
 * `resolveBarrelExport` is a standalone utility (not called by `analyzeImports`)
 * that resolves a named import from a barrel directory (e.g., `'./components'`)
 * to its original source module. Only single-level re-exports are resolved.
 */

import type { ComponentScanScriptSource } from '../component-scanner.js';
import type { ImportBinding, ImportAnalysisResult } from './types.js';

import path from 'node:path';

import { getScanner } from '../scanner-loader.js';

import { extractVueScript, extractVueOptionsApiComponents, extractMdxEsm } from './extract-script-source.js';
import { parseImports } from './parse-imports.js';
export { resolveBarrelExport } from './resolve-barrel.js';

export type { ImportBinding, ImportAnalysisResult } from './types.js';

/**
 * Supported framework types for import analysis.
 * Superset of template scanner's framework types — includes MDX which
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

function getImportFrameworkType(filePath: string): ImportFrameworkType | null {
	const ext = path.extname(filePath).toLowerCase();
	return EXTENSION_MAP[ext] ?? null;
}

async function extractScriptSource(
	filePath: string,
	source: string,
	framework: ImportFrameworkType,
): Promise<ComponentScanScriptSource | null> {
	if (framework === 'mdx') {
		return extractMdxEsm(source);
	}

	const ext = path.extname(filePath).toLowerCase();
	const scanner = await getScanner(ext);
	if (scanner?.extractScriptSource) {
		return scanner.extractScriptSource(source);
	}

	return null;
}

/**
 * Analyzes a component file's source text and extracts all static import bindings.
 * Automatically detects the framework type from the file extension and delegates
 * script source extraction to the appropriate component scanner.
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

	// Vue Options API requires special handling: extract regular <script>,
	// parse imports, then filter to only those registered in `components: { ... }`
	if (framework === 'vue') {
		const scriptSource = await extractScriptSource(filePath, source, framework);
		if (!scriptSource) {
			return analyzeVueOptionsApi(source);
		}
		const bindings = await parseImports(scriptSource.content);
		return { bindings };
	}

	const scriptSource = await extractScriptSource(filePath, source, framework);
	if (!scriptSource) {
		return { bindings: [] };
	}

	const bindings = await parseImports(scriptSource.content);
	return { bindings };
}

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

function kebabToPascalCase(str: string): string {
	if (!str.includes('-')) {
		return str;
	}
	return str
		.split('-')
		.map(part => (part.length > 0 ? part[0]!.toUpperCase() + part.slice(1) : ''))
		.join('');
}
