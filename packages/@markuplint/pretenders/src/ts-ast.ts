/**
 * @module ts-ast
 *
 * Small predicates and walkers over the syntax trees of `typescript/ast` that the package exports no
 * function for, or only as a node method. Each is pinned by `ts-ast.spec.ts`.
 */

import type { ClassDeclaration, ClassExpression, ImportClause, Node, SignatureDeclaration } from 'typescript/ast';

import { SyntaxKind } from 'typescript/ast';

/**
 * Calls `callback` with each child of `node`, and stops at the first call that returns a truthy value.
 *
 * @param node - The node whose children are visited
 * @param callback - Called with a child; a truthy result ends the walk
 * @returns That truthy result, or `undefined` when every child was visited
 */
export function forEachChild<T>(node: Node, callback: (child: Node) => T | undefined): T | undefined {
	return node.forEachChild(callback);
}

/**
 * The kinds of a node that has `parameters`: functions, methods, constructors, accessors, arrow
 * functions, and the signature and function types, and the JSDoc `@callback` / `@overload`
 * signature. It is the set of `isSignatureDeclaration` of `typescript/ast` plus that JSDoc signature,
 * written out so that the set is the one this package has always meant. The kind of the JSDoc function
 * type (`{function(): void}`) is not in it, as the syntax trees no longer have one.
 *
 * When the `typescript` package is updated, compare this with its `SignatureDeclaration` type for
 * kinds that were added; `ts-ast.spec.ts` fails for a form of the language that stops matching.
 */
const FUNCTION_LIKE_KINDS: ReadonlySet<SyntaxKind> = new Set([
	SyntaxKind.MethodSignature,
	SyntaxKind.CallSignature,
	SyntaxKind.JSDocSignature,
	SyntaxKind.ConstructSignature,
	SyntaxKind.IndexSignature,
	SyntaxKind.FunctionType,
	SyntaxKind.ConstructorType,
	SyntaxKind.FunctionDeclaration,
	SyntaxKind.MethodDeclaration,
	SyntaxKind.Constructor,
	SyntaxKind.GetAccessor,
	SyntaxKind.SetAccessor,
	SyntaxKind.FunctionExpression,
	SyntaxKind.ArrowFunction,
]);

/**
 * Whether the node is a node that has `parameters`.
 *
 * @param node - The node to test
 * @returns `true` for a function-like node
 */
export function isFunctionLike(node: Node): node is SignatureDeclaration {
	return FUNCTION_LIKE_KINDS.has(node.kind);
}

/**
 * Whether the node is a class declaration or a class expression.
 *
 * @param node - The node to test
 * @returns `true` for a class-like node
 */
export function isClassLike(node: Node): node is ClassDeclaration | ClassExpression {
	return node.kind === SyntaxKind.ClassDeclaration || node.kind === SyntaxKind.ClassExpression;
}

/**
 * Whether the import clause is `import type ...`. The clause has no `isTypeOnly`; its
 * `phaseModifier` holds `type`, and `defer` / `source`, which are not type-only.
 *
 * @param clause - The clause of an import declaration, if it has one
 * @returns `true` for `import type`
 */
export function isTypeOnlyImportClause(clause: ImportClause | undefined): boolean {
	return clause?.phaseModifier === SyntaxKind.TypeKeyword;
}
