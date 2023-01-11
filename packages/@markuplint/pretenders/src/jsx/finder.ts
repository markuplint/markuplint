import * as ts from 'typescript';

export function finder(sourceFile: ts.SourceFile) {
	return function find<N extends ts.Node>(
		node: ts.Node,
		is: (node: ts.Node) => node is N,
		visit: (node: N, sourceFile: ts.SourceFile) => void,
	) {
		if (is(node)) {
			visit(node, sourceFile);
			return;
		}
		ts.forEachChild(node, node => find(node, is, visit));
	};
}
