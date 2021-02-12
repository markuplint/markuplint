import { ignoreBlock, restoreNode } from '@markuplint/parser-utils';
import { Parse } from '@markuplint/ml-ast';
import { parse as htmlParse } from '@markuplint/html-parser';

export const parse: Parse = rawCode => {
	const blocks = ignoreBlock(rawCode, [
		{
			type: 'php-tag',
			start: /<\?php/,
			end: /\?>|$/,
		},
		{
			type: 'php-echo',
			start: /<\?=/,
			end: /\?>/,
		},
		{
			type: 'php-short-tag',
			start: /<\?/,
			end: /\?>|$/,
		},
	]);
	const doc = htmlParse(blocks.replaced);
	doc.nodeList = restoreNode(doc.nodeList, blocks);

	return doc;
};
