import { MLASTAttr, MLASTNode, MLASTNodeType, MLToken, Walker } from '@markuplint/ml-ast';
import { rePCEN } from './const';
import { v4 as uuid4 } from 'uuid';

export function uuid() {
	return uuid4();
}

/**
 *
 * @deprecated
 * @param raw
 * @param startLine
 * @param startCol
 * @param startOffset
 * @returns
 */
export function tokenizer(raw: string | null, startLine: number, startCol: number, startOffset: number): MLToken {
	raw = raw || '';
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

export function tokenizer_v2(raw: string | null, startOffset: number, rawCode: string): MLToken {
	raw = raw || '';
	const loc = sliceFragment(rawCode, startOffset, startOffset + raw.length);
	return {
		uuid: uuid(),
		...loc,
	};
}

export function sliceFragment(rawHtml: string, start: number, end: number) {
	const raw = rawHtml.slice(start, end);
	return {
		startOffset: start,
		endOffset: end,
		startLine: getLine(rawHtml, start),
		endLine: getLine(rawHtml, end),
		startCol: getCol(rawHtml, start),
		endCol: getCol(rawHtml, end),
		raw,
	};
}

export function getLine(html: string, startOffset: number) {
	return html.slice(0, startOffset).split(/\n/g).length;
}

export function getCol(html: string, startOffset: number) {
	const lines = html.slice(0, startOffset).split(/\n/g);
	return lines[lines.length - 1].length + 1;
}

export function getEndLine(html: string, line: number) {
	return html.split(/\r?\n/).length - 1 + line;
}

export function getEndCol(html: string, col: number) {
	const lines = html.split(/\r?\n/);
	const lineCount = lines.length;
	const lastLine = lines.pop()!;
	return lineCount > 1 ? lastLine.length + 1 : col + html.length;
}

export function walk(nodeList: MLASTNode[], walker: Walker, depth = 0) {
	for (const node of nodeList) {
		walker(node, depth);
		if ('childNodes' in node) {
			if (node.type === MLASTNodeType.EndTag) {
				continue;
			}
			if (node.childNodes && node.childNodes.length) {
				walk(node.childNodes, walker, depth + 1);
			}
			if ('pearNode' in node && node.pearNode) {
				walker(node.pearNode, depth);
			}
		}
	}
}

export function nodeListToDebugMaps(nodeList: MLASTNode[], withAttr = false) {
	return nodeList
		.map(n => {
			const r: string[] = [];
			if (!n.isGhost) {
				r.push(tokenDebug(n));
				if (withAttr && 'attributes' in n) {
					r.push(...attributesToDebugMaps(n.attributes).flat());
				}
			} else {
				r.push(`[N/A]>[N/A](N/A)${n.nodeName}: ${visibleWhiteSpace(n.raw)}`);
			}
			return r;
		})
		.flat();
}

export function attributesToDebugMaps(attributes: MLASTAttr[]) {
	return attributes.map(n => {
		const r = [
			tokenDebug({
				...n,
				name: n.type === 'html-attr' ? n.name.raw : n.raw,
			}),
		];
		if (n.type === 'html-attr') {
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
			r.push(`  isInvalid: ${!!n.isInvalid}`);
		}
		if (n.potentialName != null) {
			r.push(`  potentialName: ${visibleWhiteSpace(n.potentialName)}`);
		}
		if (n.type === 'html-attr' && n.candidate) {
			r.push(`  candidate: ${visibleWhiteSpace(n.candidate)}`);
		}
		return r;
	});
}

export function siblingsCorrection(nodeList: MLASTNode[]) {
	for (let i = 0; i < nodeList.length; i++) {
		const prevNode = nodeList[i - 1] || null;
		const node = nodeList[i];
		const nextNode = nodeList[i + 1] || null;
		node.prevNode = prevNode;
		node.nextNode = nextNode;
	}
}

/**
 * valid name of custom element
 *
 * @see https://html.spec.whatwg.org/multipage/custom-elements.html#valid-custom-element-name
 *
 * > - name must match the [PotentialCustomElementName](https://html.spec.whatwg.org/multipage/custom-elements.html#prod-potentialcustomelementname) production
 * > - name must not be any of the following:
 * >   - annotation-xml
 * >   - color-profile
 * >   - font-face
 * >   - font-face-src
 * >   - font-face-uri
 * >   - font-face-format
 * >   - font-face-name
 * >   - missing-glyph
 *
 * ASCII-case-insensitively.
 * Originally, it is not possible to define a name including ASCII upper alphas in the custom element, but it is not treated as illegal by the HTML parser.
 *
 * @param tagName
 */
export function isPotentialCustomElementName(tagName: string) {
	switch (tagName) {
		case 'annotation-xml':
		case 'color-profile':
		case 'font-face':
		case 'font-face-src':
		case 'font-face-uri':
		case 'font-face-format':
		case 'font-face-name':
		case 'missing-glyph': {
			return false;
		}
	}
	return rePCEN.test(tagName);
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
