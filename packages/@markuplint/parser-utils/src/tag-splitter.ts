import { reSplitterTag, reTagName } from './const';

import { getEndCol, getEndLine } from '@markuplint/parser-utils';

export interface N {
	type: 'text' | 'starttag' | 'endtag' | 'comment' | 'boguscomment';
	raw: string;
	line: number;
	col: number;
}

export default function tagSplitter(raw: string, line: number, col: number): N[] {
	return withLocation(tagSplitterAsString(raw), line, col);
}

function tagSplitterAsString(raw: string): string[] {
	const tagMatches = raw.match(reSplitterTag);
	if (!tagMatches) {
		return [raw];
	}
	const tokens = Array.from(tagMatches);

	tokens.unshift(); // remove all match

	const nodes: string[] = [];
	let rest = raw;
	for (const token of tokens) {
		const index = rest.indexOf(token);
		let length = token.length;
		if (index > 0) {
			const text = rest.slice(0, index);
			nodes.push(text);
			length += text.length;
		}
		nodes.push(token);
		rest = rest.slice(length);
	}

	if (rest) {
		nodes.push(rest);
	}

	return nodes;
}

function withLocation(nodes: readonly string[], line: number, col: number): N[] {
	const result: N[] = [];

	for (const node of nodes) {
		if (node[0] !== '<') {
			result.push({
				type: 'text',
				raw: node,
				line,
				col,
			});
		} else {
			const label = node.slice(1).slice(0, -1);

			if (reTagName.test(label)) {
				result.push({
					type: 'starttag',
					raw: node,
					line,
					col,
				});
			} else if (label[0] === '/') {
				result.push({
					type: 'endtag',
					raw: node,
					line,
					col,
				});
			} else if (label[0] === '!') {
				result.push({
					type: 'comment',
					raw: node,
					line,
					col,
				});
			} else if (label[0] === '?') {
				result.push({
					type: 'boguscomment',
					raw: node,
					line,
					col,
				});
			} else {
				result.push({
					type: 'text',
					raw: node,
					line,
					col,
				});
			}
		}
		line = getEndLine(node, line);
		col = getEndCol(node, col);
	}

	return result;
}
