import type MLDOMAttribute from '../tokens/attribute';
import type MLDOMPreprocessorSpecificAttribute from '../tokens/preprocessor-specific-attribute';
import type { AnonymousNode } from '@markuplint/ml-core';

export function nodeListToDebugMaps(nodeList: Readonly<AnonymousNode<any, any>[]>, withAttr = false) {
	return nodeList
		.map(n => {
			const r: string[] = [];
			if (n.type !== 'OmittedElement') {
				r.push(tokenDebug(n));
				if (n.type === 'Element') {
					r.push(`  namespaceURI: ${!!n.namespaceURI}`);
					r.push(`  isInFragmentDocument: ${!!n.isInFragmentDocument}`);
					r.push(`  isForeignElement: ${!!n.isForeignElement}`);
					r.push(`  isCustomElement: ${!!n.isCustomElement}`);
				}
				if (withAttr && 'attributes' in n) {
					r.push(
						...attributesToDebugMaps(n.attributes)
							.flat()
							.map(l => `  ${l}`),
					);
				}
			} else {
				r.push(`[N/A]>[N/A](N/A)${n.nodeName}: ${visibleWhiteSpace(n.raw)}`);
			}
			return r;
		})
		.flat();
}

function attributesToDebugMaps(attributes: (MLDOMAttribute | MLDOMPreprocessorSpecificAttribute)[]) {
	return attributes.map(n => {
		const r = [
			tokenDebug({
				name: n.potentialName,
				startOffset: n.startOffset,
				endOffset: n.endOffset,
				startLine: n.startLine,
				endLine: n.endLine,
				startCol: n.startCol,
				endCol: n.endCol,
				raw: n.raw,
			}),
		];
		if (n.attrType === 'html-attr') {
			r.push(`  ${tokenDebug(n.spacesBeforeName, 'bN')}`);
			r.push(`  ${tokenDebug(n.name, 'name')}`);
			r.push(`  ${tokenDebug(n.spacesBeforeEqual, 'bE')}`);
			r.push(`  ${tokenDebug(n.equal, 'equal')}`);
			r.push(`  ${tokenDebug(n.spacesAfterEqual, 'aE')}`);
			r.push(`  ${tokenDebug(n.startQuote, 'sQ')}`);
			r.push(`  ${tokenDebug(n.value, 'value')}`);
			r.push(`  ${tokenDebug(n.endQuote, 'eQ')}`);
			r.push(`  isDirective: ${!!n.isDirective}`);
			r.push(`  isDynamicValue: ${!!n.isDynamicValue}`);
		}
		if (n.potentialName != null) {
			r.push(`  potentialName: ${visibleWhiteSpace(n.potentialName)}`);
		}
		if (n.attrType === 'html-attr' && n.candidate) {
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
		raw: string;
	},
>(n: N, type = '') {
	return `[${n.startLine}:${n.startCol}]>[${n.endLine}:${n.endCol}](${n.startOffset},${n.endOffset})${
		n.nodeName || n.potentialName || n.name || n.type || type
	}: ${visibleWhiteSpace(n.raw)}`;
}

function visibleWhiteSpace(chars: string) {
	return chars.replace(/\n/g, '⏎').replace(/\t/g, '→').replace(/\s/g, '␣');
}
