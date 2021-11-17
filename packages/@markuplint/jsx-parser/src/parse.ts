import type { JSXNode } from './jsx';
import type { MLASTNode, Parse } from '@markuplint/ml-ast';

import { flattenNodes } from '@markuplint/html-parser';
import { walk } from '@markuplint/parser-utils';

import jsxParser from './jsx';
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

	const list = traverse(ast, null, rawCode);
	provideChildNodesToPSBlock(list);

	const nodeList: MLASTNode[] = flattenNodes(list, rawCode, false);

	return {
		nodeList,
		isFragment: true,
	};
};

function provideChildNodesToPSBlock(list: MLASTNode[]) {
	walk(list, psBlockNode => {
		if (psBlockNode.type !== 'psblock') {
			return;
		}

		const nParentId = psBlockNode.__parentId;

		walk(list, candidate => {
			if (psBlockNode.uuid === candidate.uuid) {
				return;
			}

			const dParentId = candidate.__parentId;

			if (nParentId !== dParentId) {
				return;
			}

			psBlockNode.childNodes = psBlockNode.childNodes || [];

			if (candidate.parentNode) {
				return;
			}

			psBlockNode.childNodes.push(candidate);
			candidate.parentNode = psBlockNode;
		});
	});
}
