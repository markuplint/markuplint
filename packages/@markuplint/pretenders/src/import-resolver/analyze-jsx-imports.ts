/**
 * @module analyze-jsx-imports
 *
 * Extracts import bindings from TSX/JSX (and plain TS/JS) source using the
 * TypeScript AST directly, rather than es-module-lexer. es-module-lexer
 * cannot parse source containing JSX syntax or non-standard TS constructs —
 * it throws, which would silently defeat import-based
 * disambiguation for exactly the file kind this package spends most of its
 * time scanning. A script block that declares `lang="tsx"` or `lang="jsx"` (Vue)
 * holds JSX as well, and is read this way ({@link scriptKindForJsxLang}); so is
 * the source {@link ./parse-imports.js} cannot read with the lexer but the
 * TypeScript parser reads without a syntax error.
 *
 * A dynamic `import()` call whose specifier is a string literal is reported as
 * a `type: 'dynamic'` binding, as {@link ./parse-imports.js}
 * does for Vue, Svelte, Astro and MDX. React presents
 * `lazy(() => import('./X'))` as the replacement of the static `import` of the
 * same component, so the file behind it must be reachable for `pretenders.auto`,
 * and the component is matched to that file under the name it is assigned to.
 */

import type { ImportBinding } from './types.js';
import type { SourceFile } from 'typescript';

import path from 'node:path';

import ts from 'typescript';

import { dynamicBindings, dynamicImportNames } from './dynamic-import-name.js';

/**
 * Collects the import bindings of `source` in source order: the static imports
 * declared at its top level, and dynamic `import('...')` calls with a string
 * literal specifier anywhere in it (a function body, `lazy(() => import(...))`).
 * Type-only imports (`import type { ... }`) and their inline equivalents
 * (`import { type X }`) are excluded, as are side-effect-only imports. A dynamic
 * import is bound under the names {@link dynamicImportNames} gives it (the variable
 * `lazy(() => import('./X'))` is assigned to, or the awaited import is read into; a loader
 * function held by a name, `lazy(load)`, gives one binding for each variable a call that takes it
 * is assigned to)
 * with `type: 'dynamic'`, or with `type: 'namespace'` when it is the whole module read into a
 * variable. One that has no name is `type: 'dynamic'` with the `'*'` sentinel as its
 * `localName`. Template literal, variable and concatenated specifiers,
 * `import.meta` and type-position `typeof import('...')` are excluded.
 *
 * @param source - The parsed TypeScript source file to inspect
 * @returns The import bindings found in `source`
 */
export function collectImportBindings(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	source: SourceFile,
): ImportBinding[] {
	const bindings: ImportBinding[] = [];

	for (const node of source.statements) {
		if (ts.isImportDeclaration(node)) {
			bindings.push(...staticImportBindings(node));
		} else {
			collectDynamicImports(node, bindings);
		}
	}

	return bindings;
}

/**
 * Appends the dynamic `import('...')` calls with a string literal specifier found
 * in `node` and its descendants to `bindings`, in source order. The caller walks
 * the top-level statements one by one so that static and dynamic imports stay in
 * the order they are written.
 */
function collectDynamicImports(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	node: ts.Node,
	bindings: ImportBinding[],
): void {
	if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
		const specifier = node.arguments[0];
		if (specifier && ts.isStringLiteral(specifier)) {
			bindings.push(...dynamicBindings(dynamicImportNames(node), specifier.text));
		}
	}
	ts.forEachChild(node, child => collectDynamicImports(child, bindings));
}

/**
 * The bindings of one static `import` declaration; none for a type-only or
 * side-effect import.
 */
function staticImportBindings(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	node: ts.ImportDeclaration,
): ImportBinding[] {
	const bindings: ImportBinding[] = [];

	if (node.importClause?.isTypeOnly || !ts.isStringLiteral(node.moduleSpecifier)) {
		return bindings;
	}
	const importClause = node.importClause;
	if (!importClause) {
		// Side-effect import: `import './a'`
		return bindings;
	}

	const moduleSource = node.moduleSpecifier.text;

	if (importClause.name) {
		bindings.push({
			localName: importClause.name.text,
			importedName: 'default',
			source: moduleSource,
			type: 'default',
		});
	}

	const namedBindings = importClause.namedBindings;
	if (!namedBindings) {
		return bindings;
	}

	if (ts.isNamespaceImport(namedBindings)) {
		bindings.push({
			localName: namedBindings.name.text,
			importedName: '*',
			source: moduleSource,
			type: 'namespace',
		});
		return bindings;
	}

	for (const element of namedBindings.elements) {
		if (element.isTypeOnly) {
			continue;
		}
		bindings.push({
			localName: element.name.text,
			importedName: element.propertyName?.text ?? element.name.text,
			source: moduleSource,
			type: 'named',
		});
	}

	return bindings;
}

/**
 * The `ts.ScriptKind` of a script block that declares `lang="tsx"` or `lang="jsx"`: the languages
 * whose script holds JSX, which es-module-lexer cannot read. `null` for any other `lang`, and for
 * a block that declares none, which the lexer reads.
 *
 * @param lang - The `lang` attribute of the script block as written
 * @returns The script kind to read the block with, or `null`
 */
export function scriptKindForJsxLang(lang: string | undefined): ts.ScriptKind | null {
	switch (lang?.toLowerCase()) {
		case 'tsx': {
			return ts.ScriptKind.TSX;
		}
		case 'jsx': {
			return ts.ScriptKind.JSX;
		}
		default: {
			return null;
		}
	}
}

/**
 * Maps a file extension to the `ts.ScriptKind` needed to parse it correctly
 * (in particular, `.tsx`/`.jsx` must be parsed with JSX syntax enabled).
 *
 * @param filePath - The file path whose extension determines the script kind
 * @returns The `ts.ScriptKind` to parse `filePath` with
 */
export function scriptKindForPath(filePath: string): ts.ScriptKind {
	const ext = path.extname(filePath).toLowerCase();
	switch (ext) {
		case '.tsx': {
			return ts.ScriptKind.TSX;
		}
		case '.jsx': {
			return ts.ScriptKind.JSX;
		}
		case '.js':
		case '.mjs':
		case '.cjs': {
			return ts.ScriptKind.JS;
		}
		default: {
			return ts.ScriptKind.TS;
		}
	}
}
