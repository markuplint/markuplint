import type { SvelteNode } from './svelte-parser/index.js';
import type { MLASTNode, Parse } from '@markuplint/ml-ast';

import { flattenNodes, ParserError, ignoreBlock, restoreNode } from '@markuplint/parser-utils';

import { svelteParse } from './svelte-parser/index.js';
import { traverse } from './traverse.js';

export const parse: Parse = (rawCode, options) => {
	const blocks = ignoreBlock(
		rawCode,
		[
			{
				type: 'Script',
				start: '<script',
				end: '</script>',
			},
			{
				type: 'Style',
				start: '<style',
				end: '</style>',
			},
		],
		'-',
	);

	let ast: SvelteNode[];
	try {
		ast = svelteParse(blocks.replaced);
	} catch (error) {
		if (error instanceof Error && 'start' in error && 'end' in error && 'frame' in error) {
			// @ts-ignore
			const raw = rawCode.slice(error.start.character, error.end.character);
			throw new ParserError(
				// @ts-ignore
				error.message + '\n' + error.frame,
				{
					// @ts-ignore
					line: error.start.line,
					// @ts-ignore
					col: error.start.column,
					raw,
				},
			);
		}
		return {
			nodeList: [],
			isFragment: true,
			parseError: error instanceof Error ? error.message : new Error(`${error}`).message,
		};
	}

	const nodes = traverse(ast, null, blocks.replaced, options);

	const nodeList: MLASTNode[] = restoreNode(flattenNodes(nodes, blocks.replaced), blocks, false);

	return {
		nodeList,
		isFragment: true,
	};
};
