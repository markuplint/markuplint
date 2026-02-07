import type { Node, SourceFile } from 'typescript';

import ts from 'typescript';

const { forEachChild } = ts;

/**
 * Creates a recursive AST node finder bound to a specific source file.
 * The returned `find` function traverses the AST depth-first, invoking the
 * visitor callback on the first node that matches the type guard predicate.
 *
 * @param sourceFile - The TypeScript source file context for the traversal
 * @returns A `find` function that searches for nodes matching a type guard and invokes a visitor
 */
export function finder(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	sourceFile: SourceFile,
) {
	/**
	 * Recursively searches the AST starting from the given node.
	 * If the node matches the type guard, the visitor is called immediately
	 * and recursion stops for that branch. Otherwise, all children are traversed.
	 *
	 * @template N - The specific AST node type to find
	 * @param node - The starting AST node to search from
	 * @param is - A TypeScript type guard predicate to match desired nodes
	 * @param visit - A callback invoked with each matched node and the source file
	 */
	return function find<N extends Node>(
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		node: Node,
		is: (
			// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
			node: Node,
		) => node is N,
		visit: (
			node: N,
			// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
			sourceFile: SourceFile,
		) => void,
	) {
		if (is(node)) {
			visit(node, sourceFile);
			return;
		}
		forEachChild(node, node => find(node, is, visit));
	};
}
