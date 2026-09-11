/**
 * @module analyze-jsx-imports
 *
 * Extracts import bindings from TSX/JSX (and plain TS/JS) source using the
 * TypeScript AST directly, rather than es-module-lexer. es-module-lexer
 * cannot parse source containing JSX syntax or non-standard TS constructs —
 * it throws and {@link ../import-resolver/parse-imports.js} swallows that
 * into an empty result — which would silently defeat import-based
 * disambiguation for exactly the file kind this package spends most of its
 * time scanning.
 */

import type { ImportBinding } from './types.js';
import type { SourceFile } from 'typescript';

import path from 'node:path';

import ts from 'typescript';

/**
 * Collects all static import bindings declared at the top level of `source`.
 * Type-only imports (`import type { ... }`) and their inline equivalents
 * (`import { type X }`) are excluded, as are side-effect-only imports.
 *
 * @param source - The parsed TypeScript source file to inspect
 * @returns The import bindings found at the top level of `source`
 */
export function collectImportBindings(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	source: SourceFile,
): ImportBinding[] {
	const bindings: ImportBinding[] = [];

	for (const node of source.statements) {
		if (!ts.isImportDeclaration(node) || node.importClause?.isTypeOnly) {
			continue;
		}
		if (!ts.isStringLiteral(node.moduleSpecifier)) {
			continue;
		}
		const importClause = node.importClause;
		if (!importClause) {
			// Side-effect import: `import './a'`
			continue;
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
			continue;
		}

		if (ts.isNamespaceImport(namedBindings)) {
			bindings.push({
				localName: namedBindings.name.text,
				importedName: '*',
				source: moduleSource,
				type: 'namespace',
			});
			continue;
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
