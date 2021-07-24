import { sliceFragment } from './utils';

export type BeforeSpaces = {
	raw: string;
	startOffset: number;
	endOffset: number;
	startLine: number;
	endLine: number;
	startCol: number;
	endCol: number;
	indent: {
		raw: string;
		width: number;
		type: 'space' | 'tab' | 'mixed';
		startOffset: number;
		endOffset: number;
		startLine: number;
		endLine: number;
		startCol: number;
		endCol: number;
	};
};

export function getBeforeSpaces(nodeStartOffset: number, rawCode: string): BeforeSpaces | null {
	const above = rawCode.slice(0, nodeStartOffset);
	const bSpaces = /\s*$/.exec(above);
	if (!bSpaces) {
		throw new Error(`Parse error: getBeforeSpaces(${nodeStartOffset}, "${rawCode}")`);
	}
	const startOffset = bSpaces.index;
	if (startOffset >= nodeStartOffset) {
		return null;
	}
	const endOffset = nodeStartOffset;
	const token = sliceFragment(rawCode, startOffset, endOffset);

	const breakPoint = token.raw.lastIndexOf('\n') + 1;
	const indentStartOffset = startOffset + breakPoint;
	const indent = sliceFragment(rawCode, indentStartOffset, endOffset);

	const width = indent.raw.length;
	const type = /^\t+$/.test(indent.raw) ? 'tab' : indent.raw.indexOf('\t') !== -1 ? 'mixed' : 'space';

	return {
		...token,
		indent: {
			...indent,
			width,
			type,
		},
	};
}
