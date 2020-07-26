import { MLASTNode, Parse } from '@markuplint/ml-ast';
import svelteParse, { SvelteNode } from './svelte-parser';
import { flattenNodes } from '@markuplint/html-parser';
import { traverse } from './traverse';

export const parse: Parse = rawCode => {
	let ast: SvelteNode[];
	try {
		ast = svelteParse(rawCode);
	} catch (err) {
		return {
			nodeList: [],
			isFragment: true,
			parseError: new Error(err).message,
		};
	}

	const nodeList: MLASTNode[] = flattenNodes(traverse(ast, null, rawCode), rawCode);

	return {
		nodeList,
		isFragment: true,
	};
};
