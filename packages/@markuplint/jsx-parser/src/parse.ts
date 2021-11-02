import { MLASTNode, Parse } from '@markuplint/ml-ast';
import jsxParser, { JSXNode } from './jsx';
import { flattenNodes } from '@markuplint/html-parser';
import { traverse } from './traverse';

export const parse: Parse = rawCode => {
	let ast: JSXNode[];
	try {
		ast = jsxParser(rawCode);
	} catch (err) {
		return {
			nodeList: [],
			isFragment: true,
			parseError: err instanceof Error ? err.message : new Error(`${err}`).message,
		};
	}

	const nodeList: MLASTNode[] = flattenNodes(traverse(ast, null, rawCode), rawCode, false);

	return {
		nodeList,
		isFragment: true,
	};
};
