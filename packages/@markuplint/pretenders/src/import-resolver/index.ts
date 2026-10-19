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
 * included in the bindings with `type: 'dynamic'`. A dynamic import is bound under the
 * name it is assigned to or read into, as `./dynamic-import-name.ts` decides
 * (`const X = lazy(() => import('./X'))` is `X`, and so is
 * `const { X } = await import('./X')`), so a lookup by name finds it like the
 * static import of that export. One that is not named uses `localName: '*'` as a
 * sentinel. Template literal and variable specifiers are excluded.
 *
 * ## Barrel file resolution
 *
 * `analyzeImports` reports import bindings only; it does not look through a
 * barrel file. Three things handle barrels, each for its own caller:
 *
 * - `collectReferencedModules` lists the re-exports of a JS/TS file (or of an
 *   MDX file's top-level ESM) along with its imports, so that `autoScan`'s
 *   walk reaches the files behind a barrel — named, star and nested barrels
 *   alike, as each barrel is just another file of the walk.
 * - The export table (`../export-table.ts`), followed by `../dependency-mapper.ts`,
 *   maps an imported name through `export { X } from` and `export * from`
 *   chains to its declaration, for disambiguation at scan time and at lint
 *   time.
 * - `resolveBarrelExport` is a standalone public utility (not called by
 *   `analyzeImports` or the walk) that maps a named import from a barrel
 *   directory (e.g., `'./components'`) to the specifier it is re-exported
 *   from. It resolves a single level only and does not see through
 *   `export * from`.
 */

import type { ComponentScanScriptSource } from '../component-scanner.js';
import type { ImportBinding, ImportAnalysisResult } from './types.js';

import path from 'node:path';

import { isComponentName, isSVGElement } from '@markuplint/parser-utils';
import { camelize, capitalize, isMultiWordName, vueTagNameMatches } from '@markuplint/shared';
import ts from 'typescript';

import { getExportTable, getReExportSources } from '../export-table.js';
import {
	getLoadedComponentNameRule,
	getLoadedNativeTagRule,
	getScanner,
	loadComponentNameRule,
} from '../scanner-loader.js';

import { collectImportBindings, scriptKindForPath } from './analyze-jsx-imports.js';
import { extractVueScript, extractVueOptionsApiRegistrations, extractMdxEsm } from './extract-script-source.js';
import { parseImports } from './parse-imports.js';
export { resolveBarrelExport } from './resolve-barrel.js';
export { collectImportBindings, scriptKindForPath } from './analyze-jsx-imports.js';

export type { ImportBinding, ImportAnalysisResult } from './types.js';

/**
 * Supported framework types for import analysis.
 * Superset of template scanner's framework types — includes MDX which
 * is a component usage site (not definition), making it relevant
 * for import analysis but not for template scanning. `jsx` covers plain
 * TS/JS source (including TSX/JSX), analyzed via the TypeScript AST instead
 * of es-module-lexer, which fails to parse JSX syntax.
 */
type ImportFrameworkType = 'vue' | 'svelte' | 'astro' | 'mdx' | 'jsx';

const EXTENSION_MAP: Record<string, ImportFrameworkType> = {
	'.vue': 'vue',
	'.svelte': 'svelte',
	'.astro': 'astro',
	'.mdx': 'mdx',
	'.js': 'jsx',
	'.jsx': 'jsx',
	'.ts': 'jsx',
	'.tsx': 'jsx',
	'.mjs': 'jsx',
	'.cjs': 'jsx',
	'.mts': 'jsx',
	'.cts': 'jsx',
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
 * Analyzes a component file's source text and extracts all import bindings, including
 * dynamic `import('...')` calls with a string literal specifier.
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

	// What reads the bindings (`isComponentBinding`) is sync, and asks the rule of the parser of the
	// file's language, which is loaded here.
	await loadComponentNameRule(path.extname(filePath).toLowerCase());

	if (framework === 'jsx') {
		return { bindings: collectImportBindings(parseJsLike(filePath, source)) };
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

	// MDX's ESM may hold JSX (`export const meta = <X />`), so it is read as TSX.
	const bindings = await parseImports(scriptSource.content, framework === 'mdx' ? ts.ScriptKind.TSX : undefined);
	return { bindings };
}

/**
 * Lists the module specifiers a file depends on for its components: those of
 * {@link analyzeImports}' bindings and, for a JS/TS-family file or the
 * top-level ESM of an MDX file, those of its re-exports too (from the export
 * table, see `getReExportSources`), so that a walk over the result passes through
 * barrel files. A re-export in a Vue / Svelte / Astro script block is not
 * listed: those files are components, not barrels.
 *
 * Unlike {@link analyzeImports}, the result is not tied to local names, which
 * is why the re-exports can be included here and not there.
 *
 * @param filePath - The absolute or relative file path (used for framework detection)
 * @param source - The full source text of the file
 * @returns The distinct specifiers in source order, imports first, or
 *          `null` if the framework is not supported
 */
export async function collectReferencedModules(filePath: string, source: string): Promise<readonly string[] | null> {
	const framework = getImportFrameworkType(filePath);
	switch (framework) {
		case null: {
			return null;
		}
		case 'jsx': {
			const sourceFile = parseJsLike(filePath, source);
			return distinct([...collectImportBindings(sourceFile).map(b => b.source), ...reExportSources(sourceFile)]);
		}
		case 'mdx': {
			// The same extraction and import parsing as `analyzeImports`, done here so
			// that the ESM block is extracted once for both lists.
			const esm = extractMdxEsm(source);
			if (!esm) {
				return [];
			}
			const bindings = await parseImports(esm.content);
			// MDX ESM may hold JSX (`export const meta = <X />`), so it is parsed as TSX.
			return distinct([...bindings.map(b => b.source), ...reExportSources(parseJsLike('esm.tsx', esm.content))]);
		}
		default: {
			const analysis = await analyzeImports(filePath, source);
			return analysis?.bindings.map(b => b.source) ?? null;
		}
	}
}

function reExportSources(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	sourceFile: ts.SourceFile,
): string[] {
	return getReExportSources(getExportTable(sourceFile));
}

function distinct(specifiers: readonly string[]): string[] {
	return [...new Set(specifiers)];
}

function parseJsLike(filePath: string, source: string) {
	return ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, scriptKindForPath(filePath));
}

async function analyzeVueOptionsApi(source: string): Promise<ImportAnalysisResult> {
	const scriptBlock = extractVueScript(source);
	if (!scriptBlock) {
		return { bindings: [] };
	}

	const allBindings = await parseImports(scriptBlock.content);
	const registrations = extractVueOptionsApiRegistrations(scriptBlock.content);

	if (registrations.length === 0) {
		return { bindings: [] };
	}

	// The binding of an import that is registered, in the order of the imports. A template names it
	// by the key it is registered under (`registeredAs`), which is not the name of the binding for
	// `Btn: MyButton` or `'foo-bar': Foo`.
	const bindings = allBindings.flatMap(binding =>
		registrations
			.filter(({ name }) => name === binding.localName)
			.map(({ key }) => (key === binding.localName ? binding : { ...binding, registeredAs: key })),
	);
	return { bindings };
}

/**
 * Whether the file is a Vue one, whose template resolves a tag to a component by any spelling of
 * its name (see `resolvesToVueComponent` of `@markuplint/shared`).
 *
 * @param filePath - The path of the file, of which the extension tells the language
 * @returns Whether the file is a Vue one
 */
export function isVueFile(filePath: string | undefined): boolean {
	return filePath !== undefined && getImportFrameworkType(filePath) === 'vue';
}

/**
 * The names a tag of a Vue template is looked up under, in the order Vue tries them
 * (`resolveSetupReference` of `@vue/compiler-core`; `resolveAsset` of `@vue/runtime-core` for a global
 * registration): the tag as written, camelized, and capitalized after camelizing.
 *
 * Only a tag that is no native element is looked up under the other two: a native one (`<button>`,
 * `<circle>`, the camelCase names of SVG such as `<clipPath>`) is never resolved to a component by Vue
 * (`isNativeTag`), so `<button>` is not `Button` nor an import named `button`, while `<card>` is `import Card`.
 * Whether a tag is native is the answer of the Vue parser (`VueParser#isNativeTag`, the lists of `@vue/shared`),
 * which `analyzeImports`, `scan` and the template scanner load before they read a Vue file; a caller that
 * runs without any of them (the exported `dependencyMapper` on bindings it was given) loads it with
 * `loadComponentNameRule('.vue')` first. Without it a tag of one word and the camelCase names of SVG are
 * taken for native ones, which is the safe side: the other two names are only looked up for a name of more
 * than one word, and the tag as written is still looked up.
 *
 * @param tag - The tag name as written
 * @returns The names without repeats, the first the most preferred; none for a native tag
 */
export function vueSetupNames(tag: string): readonly string[] {
	const isNative = getLoadedNativeTagRule('.vue');
	if (isNative) {
		if (isNative(tag)) {
			return [];
		}
	} else if (isSVGElement(tag) || !isMultiWordName(tag)) {
		return [tag];
	}
	const camelName = camelize(tag);
	return [...new Set([tag, camelName, capitalize(camelName)])];
}

/**
 * Whether the binding may be what a tag of a component refers to, judged by its local name in the
 * language of the file. It is the one rule for the names that the lookups of this module and the
 * alias map (`aliasEntryImports` of `../dependency-mapper.ts`) take for components:
 *
 * - In JSX, MDX, Svelte and Astro a tag with a lowercase initial is an HTML element, so `import myButton
 *   from './Foo'` is not what `<myButton>` renders: https://react.dev/learn/your-first-component,
 *   https://svelte.dev/docs/svelte/basic-markup, https://docs.astro.build/en/reference/astro-syntax/.
 *   What a component's name is differs in the details (JSX takes `_Layout`, Astro takes a capital
 *   initial only), so it is the rule of the parser of the language (`Parser#isComponentName`), which
 *   `analyzeImports` loads from the parser package when it reads the file: this package knows no
 *   language's rule. Without a parser to ask it is the form most languages share (`isComponentName` of
 *   `@markuplint/parser-utils`).
 * - Vue resolves a tag that is not a native one to a component whatever its initial is: `<myButton>`
 *   and `<my-button>` are `import myButton` (https://vuejs.org/guide/components/registration.html#component-name-casing).
 *   Whether a binding leads to a component is what the map of the scan says; a name that leads to none
 *   gets no alias, so the name alone is not judged here.
 *
 * It judges the local name only: a namespace binding is a head of a member tag (`ui.Item`), whose
 * own name is not judged at all, which is for the caller to ask.
 *
 * @param binding - The import binding
 * @param filePath - The file the binding is in (its extension tells the language)
 * @returns Whether the binding may be what a tag of a component refers to
 */
export function isComponentBinding(binding: ImportBinding, filePath: string): boolean {
	if (isVueFile(filePath)) {
		return true;
	}
	// The rule of the parser of the language, which `analyzeImports` loaded: the file's bindings
	// come from it. A language with no parser to ask is judged by the form most languages share.
	const rule = getLoadedComponentNameRule(path.extname(filePath).toLowerCase()) ?? isComponentName;
	return rule(binding.localName);
}

/**
 * Resolves a component name used in a template to its import source path.
 * For Vue, handles both PascalCase (`<MyButton>`) and kebab-case (`<my-button>`)
 * representations of the same component by normalizing to PascalCase for lookup.
 *
 * In a Vue file (`filePath` is given and is one) the lookup is the one of Vue itself (`resolveSetupReference`
 * of `@vue/compiler-core`): the tag as written, then camelized, then capitalized after camelizing, so that
 * `<fooBar>` is `import fooBar` too, and `<foo-bar>` is `import fooBar` as well as `import FooBar`. In any other
 * file a name is looked up as it is or, if it is kebab-case, as its PascalCase.
 *
 * @param componentName - The component name as used in the template
 * @param bindings - The import bindings extracted from the script block
 * @param filePath - The file the template is in, if the language should decide the lookup
 * @returns The matching import binding, or `undefined` if no match is found
 */
export function resolveComponentImport(
	componentName: string,
	bindings: readonly ImportBinding[],
	filePath?: string,
): ImportBinding | undefined {
	if (isVueFile(filePath)) {
		for (const name of vueSetupNames(componentName)) {
			const found = bindings.find(b => registeredName(b) === name);
			if (found) {
				return found;
			}
		}
		return undefined;
	}

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
 * Resolves the type name of a pretender's selector (the name a component is known by: the one
 * `deriveName` makes of a file, or the one of the declaration) to the binding the file imports it as.
 *
 * It differs from {@link resolveComponentImport} only in a Vue file, where a selector stands for a tag
 * by `vueTagNameMatches` and the tag is the binding: the selector `FooBar` is `import fooBar`, as it is the
 * tag `<fooBar>`, though the tag `<FooBar>` is not. In any other file it is the same lookup.
 *
 * @param selector - The type name of the selector
 * @param bindings - The import bindings of the file
 * @param filePath - The file the bindings are in
 * @returns The matching import binding, or `undefined` if no match is found
 */
export function resolveSelectorImport(
	selector: string,
	bindings: readonly ImportBinding[],
	filePath: string,
): ImportBinding | undefined {
	if (!isVueFile(filePath)) {
		return resolveComponentImport(selector, bindings);
	}
	return (
		bindings.find(b => registeredName(b) === selector) ??
		bindings.find(b => b.type !== 'namespace' && vueTagNameMatches(selector, registeredName(b)))
	);
}

/**
 * The name a Vue template refers to the binding by: the key of the Options API that registers it,
 * or else the name the import gives it.
 *
 * @param binding - The import binding
 * @returns The name the template refers to the binding by
 */
export function registeredName(binding: ImportBinding): string {
	return binding.registeredAs ?? binding.localName;
}

/**
 * Converts a kebab-case name to PascalCase (`my-button` → `MyButton`): the name a Vue-style
 * script imports a kebab-case component as. A name without `-` is returned as it is.
 *
 * @param str - The name to convert
 * @returns The PascalCase name
 */
export function kebabToPascalCase(str: string): string {
	if (!str.includes('-')) {
		return str;
	}
	return str
		.split('-')
		.map(part => (part.length > 0 ? part[0]!.toUpperCase() + part.slice(1) : ''))
		.join('');
}
