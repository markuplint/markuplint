import { ignoreBlock, restoreNode } from '@markuplint/parser-utils';
import { Parse } from '@markuplint/ml-ast';
import { parse as htmlParse } from '@markuplint/html-parser';

export const parse: Parse = rawCode => {
	const blocks = ignoreBlock(rawCode, [
		{
			type: 'liquid-block',
			start: /{%/,
			end: /%}/,
		},
		{
			type: 'liquid-output',
			start: /{{/,
			end: /}}/,
		},
	]);
	const doc = htmlParse(blocks.replaced);
	doc.nodeList = restoreNode(doc.nodeList, blocks);

	return doc;
};
