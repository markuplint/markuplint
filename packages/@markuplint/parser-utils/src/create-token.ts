import type { MLToken } from '@markuplint/ml-ast';

import { v4 as uuid4 } from 'uuid';

import { getEndCol, getEndLine, sliceFragment } from './get-location.js';

export function tokenizer(raw: string | null, startLine: number, startCol: number, startOffset: number): MLToken {
	raw = raw ?? '';
	const endLine = getEndLine(raw, startLine);
	const endCol = getEndCol(raw, startCol);
	const endOffset = startOffset + raw.length;
	return {
		uuid: uuid(),
		raw,
		startOffset,
		endOffset,
		startLine,
		endLine,
		startCol,
		endCol,
	};
}

export function createTokenFromRawCode(raw: string | null, startOffset: number, rawCode: string): MLToken {
	raw = raw ?? '';
	const loc = sliceFragment(rawCode, startOffset, startOffset + raw.length);
	return {
		uuid: uuid(),
		...loc,
	};
}

export function uuid() {
	return uuid4();
}
