import type { AnonymousNode } from '../types';
import MLDOMIndentation from '../tokens/indentation';

/**
 *
 * @deprecated
 * @param node
 */
export function getIndent(node: AnonymousNode<any, any>) {
	const prevToken = node.prevToken;
	if (!prevToken) {
		return null;
	}

	if (node.type === 'Text') {
		if (node.isRawText) {
			return null;
		}

		const matched = node.raw.match(/^(\s*(?:\r?\n)+\s*)(?:[^\s]+)/);
		if (matched) {
			const spaces = matched[1];
			if (spaces) {
				const spaceLines = spaces.split(/\r?\n/);
				const line = spaceLines.length + node.startLine - 1;
				const lastSpace = spaceLines.pop();
				if (lastSpace != null) {
					return new MLDOMIndentation(node, lastSpace, line, node);
				}
			}
		}
		return null;
	}

	if (prevToken.type !== 'Text') {
		return null;
	}

	// One or more newlines and zero or more spaces or tabs.
	// Or, If textNode is first token and that is filled spaces, tabs and newlines only.
	const matched = isFirstToken(prevToken)
		? prevToken.raw.match(/^(?:[ \t]*\r?\n)*([ \t]*)$/)
		: prevToken.raw.match(/\r?\n([ \t]*)$/);
	// console.log({ [`${this}`]: matched, _: prevToken.raw, f: prevToken._isFirstToken() });
	if (matched) {
		// Spaces will include empty string.
		const spaces = matched[1];
		if (spaces != null) {
			return new MLDOMIndentation(prevToken, spaces, node.startLine, node);
		}
	}

	return null;
}

function isFirstToken(node: AnonymousNode<any, any>) {
	return !node.prevToken;
}
