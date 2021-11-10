import type { Parse } from '@markuplint/ml-ast';

import { parse as htmlParse } from '@markuplint/html-parser';
import { ignoreBlock, restoreNode } from '@markuplint/parser-utils';

export const parse: Parse = rawCode => {
	const blocks = ignoreBlock(rawCode, [
		{
			type: 'ejs-whitespace-slurping',
			start: /<%_/,
			end: /%>/,
		},
		{
			type: 'ejs-output-value',
			start: /<%=/,
			end: /%>/,
		},
		{
			type: 'ejs-output-unescaped',
			start: /<%-/,
			end: /%>/,
		},
		{
			type: 'ejs-comment',
			start: /<%#/,
			end: /%>/,
		},
		{
			type: 'ejs-scriptlet',
			start: /<%(?!%)/,
			end: /%>/,
		},
	]);
	const doc = htmlParse(blocks.replaced);
	doc.nodeList = restoreNode(doc.nodeList, blocks);

	return doc;
};
