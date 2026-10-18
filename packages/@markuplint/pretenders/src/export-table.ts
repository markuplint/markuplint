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
 * A binding the file imports and exports again (`import Item from './Item';
 * export default Item`) is recorded as a re-export of what it imports, as the
 * file declares no component under that name.
 *
 * Only top-level export and import syntax is inspected; this module does not resolve
 * across files (that is `resolve-module-file`'s job) or follow
 * `export * from` chains — a star re-export is recorded as-is, and any
 * caller doing multi-file resolution must decide how far to follow it.
 *
 * Type-only exports (`export type { X } from`, `export type *`, an inline
 * `type` specifier) are left out: a type carries no component, and both the
 * declaration lookup and `autoScan`'s walk (through {@link getReExportSources})
 * read this one table, so they agree on which statements lead anywhere.
 */

import type { SourceFile } from 'typescript';

import ts from 'typescript';

/**
 * Where a single exported name resolves to: a declaration in the same file,
 * or a re-export of a name from another module.
 */
export type ExportEntry =
	| {
			readonly kind: 'local';
			readonly localName: string;
			/**
			 * For a default export that is no binding ({@link DEFAULT_LOCAL_NAME}), the binding
			 * it wraps (`memo(Item)` wraps `Item`, see {@link wrappedIdentifier}). When the
			 * scanner finds no component of its own in the default export, it is the
			 * component of this binding, if that has one.
			 */
			readonly wraps?: ExportEntry;
	  }
	| {
			readonly kind: 're-export';
			readonly source: string;
			readonly importedName: string;
			/**
			 * The file exports a binding it imports (`import X from`, then `export default X`).
			 * The import statement already leads `autoScan`'s walk there, so
			 * {@link getReExportSources} leaves it out.
			 */
			readonly viaImport?: true;
	  };

/**
 * The `localName` of a default export that has no local binding (`export default () => ...`,
 * `export default function () {...}`). No local binding can be named `default`, a reserved
 * word, so it never stands for another declaration of the file. The JSX scanner keys such a
 * component by the same name.
 */
export const DEFAULT_LOCAL_NAME = 'default';

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
	const imports = collectImports(source);

	for (const node of source.statements) {
		if (ts.isExportAssignment(node)) {
			if (node.isExportEquals) {
				continue;
			}
			byName.set('default', defaultEntry(node.expression, imports));
			continue;
		}

		if (ts.isExportDeclaration(node)) {
			collectExportDeclaration(node, byName, starReExportSources, imports);
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

/**
 * Lists the module specifiers a file re-exports from, named, namespace and
 * star re-exports alike (type-only ones are not in the table). A specifier
 * appears once per name re-exported from it, so callers that want each
 * module once deduplicate.
 *
 * @param table - The file's export table
 * @returns The re-exported module specifiers, named and namespace first, then star
 */
export function getReExportSources(table: ExportTable): string[] {
	const sources: string[] = [];
	for (const entry of table.byName.values()) {
		if (entry.kind === 're-export' && !entry.viaImport) {
			sources.push(entry.source);
		}
	}
	return [...sources, ...table.starReExportSources];
}

/**
 * The entry of `export default <expression>`. An identifier names its declaration, or
 * the binding it imports. Any other expression is a value without a name of its own:
 * {@link DEFAULT_LOCAL_NAME}, with the binding it wraps, if any, as `wraps`.
 */
function defaultEntry(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	expression: ts.Expression,
	imports: ReadonlyMap<string, ImportedBinding>,
): ExportEntry {
	if (ts.isIdentifier(expression)) {
		return localEntry(expression.text, imports);
	}
	const wrapped = wrappedIdentifier(expression);
	return wrapped == null
		? { kind: 'local', localName: DEFAULT_LOCAL_NAME }
		: { kind: 'local', localName: DEFAULT_LOCAL_NAME, wraps: localEntry(wrapped, imports) };
}

/**
 * The entry of a local binding exported by name: a re-export when the binding is an import,
 * so that resolution follows it to the module that declares it.
 *
 * @param localName - The local binding that is exported
 * @param imports - The bindings the file imports
 * @param namespaces - Whether a namespace import is a re-export of its module (`export { B }`):
 *   a default export of it, or the argument of a wrapper call, is no component to follow
 * @returns The export entry of the binding
 */
function localEntry(localName: string, imports: ReadonlyMap<string, ImportedBinding>, namespaces = false): ExportEntry {
	const imported = imports.get(localName);
	// A namespace import is a re-export only where it is exported by name (`export { B }`): a default
	// export of it, or a wrapper's argument, is no component to follow.
	return imported && (namespaces || imported.importedName !== '*')
		? { kind: 're-export', ...imported, viaImport: true }
		: { kind: 'local', localName };
}

/**
 * The binding a wrapper call wraps: the first argument of the outermost call, followed
 * down through wrapper calls, parentheses and type assertions. A higher-order component
 * takes its configuration in an inner call and the component in the outer one, and a
 * call that takes the component with more arguments takes it first:
 *
 * - `memo(Item)`, `memo(Item as FC)`, `memo(Item, areEqual)` → `Item`
 * - `connect(map)(Item)`, `withLayout(Layout)(Page)` → `Item`, `Page`
 * - `withRouter(connect(map)(Item))` → `Item`
 * - `Object.assign(Root, { Item })` → `Root`
 *
 * Anything else, such as a function written in place, a property access (`Item.Root`),
 * or a call without arguments, wraps no binding.
 *
 * The JSX scanner takes no component of its own from a default export that wraps a binding,
 * so that a function written in the configuration (`withLayout(({ children }) => …)(Page)`)
 * is not taken for the component: it is the component of `Page`.
 *
 * @param node - The expression of `export default`
 * @returns The name of the wrapped binding, or `undefined`
 */
export function wrappedIdentifier(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	node: ts.Expression,
): string | undefined {
	if (ts.isIdentifier(node)) {
		return node.text;
	}
	if (
		ts.isParenthesizedExpression(node) ||
		ts.isAsExpression(node) ||
		ts.isSatisfiesExpression(node) ||
		ts.isNonNullExpression(node)
	) {
		return wrappedIdentifier(node.expression);
	}
	if (ts.isCallExpression(node)) {
		const [first] = node.arguments;
		return first == null ? undefined : wrappedIdentifier(first);
	}
	return undefined;
}

type ImportedBinding = { readonly source: string; readonly importedName: string };

/**
 * The local names the file imports, other than type-only imports, each with the module and
 * name it is imported from (`'*'` for a namespace import, which `export { B }` then re-exports
 * as a namespace, as `export * as B from` does).
 */
function collectImports(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	source: SourceFile,
): Map<string, ImportedBinding> {
	const imports = new Map<string, ImportedBinding>();
	for (const node of source.statements) {
		if (
			!ts.isImportDeclaration(node) ||
			!ts.isStringLiteral(node.moduleSpecifier) ||
			!node.importClause ||
			node.importClause.isTypeOnly
		) {
			continue;
		}
		const from = node.moduleSpecifier.text;
		const { name, namedBindings } = node.importClause;
		if (name) {
			imports.set(name.text, { source: from, importedName: 'default' });
		}
		if (namedBindings && ts.isNamespaceImport(namedBindings)) {
			imports.set(namedBindings.name.text, { source: from, importedName: '*' });
		}
		if (namedBindings && ts.isNamedImports(namedBindings)) {
			for (const element of namedBindings.elements) {
				if (!element.isTypeOnly) {
					imports.set(element.name.text, {
						source: from,
						importedName: element.propertyName?.text ?? element.name.text,
					});
				}
			}
		}
	}
	return imports;
}

function collectExportDeclaration(
	node: ts.ExportDeclaration,
	byName: Map<string, ExportEntry>,
	starReExportSources: string[],
	imports: ReadonlyMap<string, ImportedBinding>,
) {
	if (node.isTypeOnly) {
		// `export type { X } from` / `export type * from` — a type carries no component
		return;
	}

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
		if (element.isTypeOnly) {
			continue;
		}
		const exportedName = element.name.text;
		const originalName = element.propertyName?.text ?? exportedName;

		if (source) {
			// `export { Item } from './a'` / `export { default as Item } from './a'`
			byName.set(exportedName, { kind: 're-export', source, importedName: originalName });
		} else {
			// `export { Item }` / `export { Item as ListItem }` — re-exporting a local binding
			byName.set(exportedName, localEntry(originalName, imports, exportedName !== 'default'));
		}
	}
}

function collectDeclarationWithModifiers(
	node: ts.FunctionDeclaration | ts.ClassDeclaration,
	byName: Map<string, ExportEntry>,
) {
	if (!hasExportModifier(node)) {
		return;
	}

	if (hasDefaultModifier(node)) {
		byName.set('default', { kind: 'local', localName: node.name?.text ?? DEFAULT_LOCAL_NAME });
		return;
	}

	if (!node.name) {
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
