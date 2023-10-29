import type { MLASTHTMLAttr } from '@markuplint/ml-ast';

import { AttrState, attrTokenizer } from '@markuplint/parser-utils';

export function directiveTokenizer(
	raw: string,
	rawValue: string,
	line: number,
	col: number,
	startOffset: number,
): MLASTHTMLAttr {
	const nameOnly = raw.trim().startsWith('{') && raw.trim().endsWith('}');

	const directiveToken = attrTokenizer(
		raw,
		line,
		col,
		startOffset,
		[
			{ start: '"', end: '"' },
			{ start: "'", end: "'" },
			{ start: '{', end: '}' },
		],
		nameOnly ? AttrState.BeforeValue : AttrState.BeforeName,
		[
			{ start: '"', end: '"' },
			{ start: "'", end: "'" },
			{ start: '`', end: '`' },
			{ start: '${', end: '}' },
		],
	);

	directiveToken.isDirective = true;

	return directiveToken;
}
