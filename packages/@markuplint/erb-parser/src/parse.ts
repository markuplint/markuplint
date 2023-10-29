import type { Parse } from '@markuplint/ml-ast';

import { parse as htmlParse } from '@markuplint/html-parser';
import { ignoreBlock, restoreNode } from '@markuplint/parser-utils';

export const parse: Parse = (rawCode, options) => {
	const blocks = ignoreBlock(rawCode, [
		{
			type: 'erb-ruby-expression',
			start: '<%=',
			end: '%>',
		},
		{
			type: 'erb-comment',
			start: '<%#',
			end: '%>',
		},
		{
			type: 'erb-ruby-code',
			start: /<%(?!%)/,
			end: '%>',
		},
		// WIP. If it use trim_mode.
		// {
		// 	type: 'erb-ruby-code-line',
		// 	start: /(?:^|\n)\s*%(?!%)/,
		// 	end: /\n|$/
		// }
	]);
	const doc = htmlParse(blocks.replaced, options);
	doc.nodeList = restoreNode(doc.nodeList, blocks);

	return doc;
};
