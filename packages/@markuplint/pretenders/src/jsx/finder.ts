import type { Node, SourceFile } from 'typescript';

import ts from 'typescript';

const { forEachChild } = ts;

export function finder(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	sourceFile: SourceFile,
) {
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
