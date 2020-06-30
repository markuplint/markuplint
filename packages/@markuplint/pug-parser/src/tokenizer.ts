import { getEndCol, getEndLine } from '@markuplint/html-parser';
import { MLToken } from '@markuplint/ml-ast';
import { v4 as uuid4 } from 'uuid';

export default function (raw: string | null, line: number, col: number, startOffset: number): MLToken {
	raw = raw || '';
	return {
		uuid: uuid4(),
		raw,
		startLine: line,
		endLine: getEndLine(raw, line),
		startCol: col,
		endCol: getEndCol(raw, col),
		startOffset,
		endOffset: startOffset + raw.length,
	};
}
