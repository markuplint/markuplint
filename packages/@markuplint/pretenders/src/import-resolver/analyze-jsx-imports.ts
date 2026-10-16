/**
 * @module analyze-jsx-imports
 *
 * Extracts import bindings from TSX/JSX (and plain TS/JS) source using the
 * TypeScript AST directly, rather than es-module-lexer. es-module-lexer
 * cannot parse source containing JSX syntax or non-standard TS constructs —
 * it throws and {@link ./parse-imports.js} swallows that
 * into an empty result — which would silently defeat import-based
 * disambiguation for exactly the file kind this package spends most of its
 * time scanning.
 *
 * A dynamic `import()` call whose specifier is a string literal is reported as
 * a `type: 'dynamic'` binding, as {@link ./parse-imports.js}
 * does for Vue, Svelte, Astro and MDX. React presents
 * `lazy(() => import('./X'))` as the replacement of the static `import` of the
 * same component, so the file behind it must be reachable for `pretenders.auto`.
 */

import type { ImportBinding } from './types.js';
import type { SourceFile } from 'typescript';

import path from 'node:path';

import ts from 'typescript';

/**
 * Collects the import bindings of `source` in source order: the static imports
 * declared at its top level, and dynamic `import('...')` calls with a string
 * literal specifier anywhere in it (a function body, `lazy(() => import(...))`).
 * Type-only imports (`import type { ... }`) and their inline equivalents
 * (`import { type X }`) are excluded, as are side-effect-only imports. Dynamic
 * imports have no local name, so they use the `'*'` sentinel with
 * `type: 'dynamic'`; template literal, variable and concatenated specifiers,
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
			bindings.push({ localName: '*', importedName: '*', source: specifier.text, type: 'dynamic' });
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
