/**
 * @module export-table
 *
 * Builds a per-file table of what a module exports, resolving each exported
 * name back to either a local declaration or a re-export of another module.
 * This replaces name-guessing when linking an imported identifier to the
 * pretender entry for the declaration it actually refers to — including
 * `export default`, aliased named exports, and barrel-style re-exports
 * (`export { X } from './y'`), which are just a special case of the same
 * lookup instead of separate logic.
 *
 * Only top-level export syntax is inspected; this module does not resolve
 * across files (that is `resolve-module-file`'s job) or follow
 * `export * from` chains — a star re-export is recorded as-is, and any
 * caller doing multi-file resolution must decide how far to follow it.
 */

import type { SourceFile } from 'typescript';

import ts from 'typescript';

/**
 * Where a single exported name resolves to: a declaration in the same file,
 * or a re-export of a name from another module.
 */
export type ExportEntry =
	| { readonly kind: 'local'; readonly localName: string }
	| { readonly kind: 're-export'; readonly source: string; readonly importedName: string };

/**
 * A file's export surface, as extracted by {@link getExportTable}.
 */
export interface ExportTable {
	/** Exported name (`'default'` for the default export) → where it comes from. */
	readonly byName: ReadonlyMap<string, ExportEntry>;
	/** Module specifiers of `export * from '...'` statements found in the file. */
	readonly starReExportSources: readonly string[];
}

/**
 * Extracts the export table from an already-parsed source file.
 *
 * @param source - The parsed TypeScript source file to inspect
 * @returns The file's export table
 */
export function getExportTable(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	source: SourceFile,
): ExportTable {
	const byName = new Map<string, ExportEntry>();
	const starReExportSources: string[] = [];

	for (const node of source.statements) {
		if (ts.isExportAssignment(node)) {
			if (node.isExportEquals) {
				continue;
			}
			const localName = ts.isIdentifier(node.expression) ? node.expression.text : undefined;
			if (localName) {
				byName.set('default', { kind: 'local', localName });
			}
			continue;
		}

		if (ts.isExportDeclaration(node)) {
			collectExportDeclaration(node, byName, starReExportSources);
			continue;
		}

		if (ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node)) {
			collectDeclarationWithModifiers(node, byName);
			continue;
		}

		if (ts.isVariableStatement(node) && hasExportModifier(node)) {
			for (const declaration of node.declarationList.declarations) {
				if (ts.isIdentifier(declaration.name)) {
					byName.set(declaration.name.text, { kind: 'local', localName: declaration.name.text });
				}
			}
		}
	}

	return { byName, starReExportSources };
}

function collectExportDeclaration(
	node: ts.ExportDeclaration,
	byName: Map<string, ExportEntry>,
	starReExportSources: string[],
) {
	const source =
		node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier) ? node.moduleSpecifier.text : undefined;

	if (!node.exportClause) {
		// `export * from './a'` — bare star re-export, no local module specifier means nothing to record
		if (source) {
			starReExportSources.push(source);
		}
		return;
	}

	if (ts.isNamespaceExport(node.exportClause)) {
		// `export * as ns from './a'`
		if (source) {
			byName.set(node.exportClause.name.text, { kind: 're-export', source, importedName: '*' });
		}
		return;
	}

	for (const element of node.exportClause.elements) {
		const exportedName = element.name.text;
		const originalName = element.propertyName?.text ?? exportedName;

		if (source) {
			// `export { Item } from './a'` / `export { default as Item } from './a'`
			byName.set(exportedName, { kind: 're-export', source, importedName: originalName });
		} else {
			// `export { Item }` / `export { Item as ListItem }` — re-exporting a local binding
			byName.set(exportedName, { kind: 'local', localName: originalName });
		}
	}
}

function collectDeclarationWithModifiers(
	node: ts.FunctionDeclaration | ts.ClassDeclaration,
	byName: Map<string, ExportEntry>,
) {
	if (!hasExportModifier(node) || !node.name) {
		return;
	}

	if (hasDefaultModifier(node)) {
		byName.set('default', { kind: 'local', localName: node.name.text });
		return;
	}

	byName.set(node.name.text, { kind: 'local', localName: node.name.text });
}

function hasExportModifier(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	node: ts.FunctionDeclaration | ts.ClassDeclaration | ts.VariableStatement,
): boolean {
	return (node.modifiers ?? []).some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword);
}

function hasDefaultModifier(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	node: ts.FunctionDeclaration | ts.ClassDeclaration,
): boolean {
	return (node.modifiers ?? []).some(modifier => modifier.kind === ts.SyntaxKind.DefaultKeyword);
}
