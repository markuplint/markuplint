import type { MLAttr } from '../node/attr.js';
import type { MLNode } from '../node/node.js';

export function nodeListToDebugMaps(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	nodeList: Readonly<MLNode<any, any>[]>,
	withAttr = false,
): string[] {
	return nodeList.flatMap(n => {
		const r: string[] = [];
		if (n.is(n.ELEMENT_NODE) && n.isOmitted) {
			r.push(`[N/A]>[N/A](N/A)${n.nodeName}: ${visibleWhiteSpace(n.raw)}`);
			return r;
		}
		r.push(tokenDebug(n));
		if (n.is(n.ELEMENT_NODE)) {
			r.push(
				//
				`  namespaceURI: ${!!n.namespaceURI}`,
				`  elementType: ${n.elementType}`,
				`  isInFragmentDocument: ${n.isInFragmentDocument()}`,
				`  isForeignElement: ${!!n.isForeignElement}`,
			);
			if (withAttr) {
				r.push(
					...attributesToDebugMaps(n.attributes)
						.flat()
						.map(l => `  ${l}`),
				);
			}
		}
		return r;
	});
}

function attributesToDebugMaps(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	attributes: ReadonlyArray<MLAttr<any, any>>,
): string[] {
	return attributes.flatMap(n => {
		const r = [
			tokenDebug({
				name: n.name,
				startOffset: n.startOffset,
				endOffset: n.endOffset,
				startLine: n.startLine,
				endLine: n.endLine,
				startCol: n.startCol,
				endCol: n.endCol,
				raw: n.raw,
			}),
		];
		if (n.spacesBeforeName) {
			r.push(`  ${tokenDebug(n.spacesBeforeName, 'bN')}`);
		}
		if (n.nameNode) {
			r.push(`  ${tokenDebug(n.nameNode, 'name')}`);
		}
		if (n.spacesBeforeEqual) {
			r.push(`  ${tokenDebug(n.spacesBeforeEqual, 'bE')}`);
		}
		if (n.equal) {
			r.push(`  ${tokenDebug(n.equal, 'equal')}`);
		}
		if (n.spacesAfterEqual) {
			r.push(`  ${tokenDebug(n.spacesAfterEqual, 'aE')}`);
		}
		if (n.startQuote) {
			r.push(`  ${tokenDebug(n.startQuote, 'sQ')}`);
		}
		if (n.valueNode) {
			r.push(`  ${tokenDebug(n.valueNode, 'value')}`);
		}
		if (n.endQuote) {
			r.push(`  ${tokenDebug(n.endQuote, 'eQ')}`);
		}
		if (n.spacesBeforeName) {
			r.push(
				//
				`  isDirective: ${!!n.isDirective}`,
				`  isExpressionValue: ${!!n.isExpressionValue}`,
				`  isDynamicValue: ${!!n.isDynamicValue}`,
				`  isAbsent: ${!!n.isAbsent}`,
			);
		}
		if (n.candidate) {
			r.push(`  candidate: ${visibleWhiteSpace(n.candidate)}`);
		}
		return r;
	});
}

function tokenDebug<
	N extends {
		startOffset: number;
		endOffset: number;
		startLine: number;
		endLine: number;
		startCol: number;
		endCol: number;
		nodeName?: string;
		name?: string;
		potentialName?: string;
		type?: string;
		blockBehavior?: { readonly type: string } | null;
		raw: string;
	},
>(n: N, type = '') {
	// The behavior is printed after the name as `@markuplint/parser-utils` prints it
	return `[${n.startLine}:${n.startCol}]>[${n.endLine}:${n.endCol}](${n.startOffset},${n.endOffset})${
		n.nodeName ?? n.potentialName ?? n.name ?? n.type ?? type
	}${n.blockBehavior?.type ? ` (${n.blockBehavior.type})` : ''}: ${visibleWhiteSpace(n.raw)}`;
}

function visibleWhiteSpace(chars: string) {
	return chars.replaceAll('\n', '⏎').replaceAll('\t', '→').replaceAll(/\s/g, '␣');
}
