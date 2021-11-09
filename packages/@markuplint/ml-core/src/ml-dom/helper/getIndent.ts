import type { MLDOMNode, MLDOMText } from '../tokens';
import type { AnonymousNode } from '../types';

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

class MLDOMIndentation {
	readonly line: number;

	#node: MLDOMText<any, any>;
	#parent: MLDOMNode<any, any>;
	#fixed: string;

	constructor(originTextNode: MLDOMText<any, any>, raw: string, line: number, parentNode: MLDOMNode<any, any>) {
		this.line = line;
		this.#node = originTextNode;
		this.#parent = parentNode;
		this.#fixed = raw;
	}

	get type(): 'tab' | 'space' | 'mixed' | 'none' {
		if (this.#parent.type !== 'Text' && this.line !== this.#node.endLine) {
			return 'none';
		}
		const raw = this.#fixed;
		return raw === '' ? 'none' : /^\t+$/.test(raw) ? 'tab' : /^[^\t]+$/.test(raw) ? 'space' : 'mixed';
	}

	get width() {
		if (this.#parent.type !== 'Text' && this.line !== this.#node.endLine) {
			return 0;
		}
		return this.#fixed.length;
	}

	get raw() {
		if (this.#parent.type !== 'Text' && this.line !== this.#node.endLine) {
			return '';
		}
		return this.#fixed;
	}

	fix(raw: string) {
		const current = this.#fixed;
		this.#fixed = raw;
		if (this.#node) {
			const node = this.#node;
			const line = node.startLine;
			const lines = node.raw.split(/\r?\n/);
			const index = this.line - line;
			if (lines[index] != null) {
				lines[index] = lines[index].replace(current, this.#fixed);
			}
			node.fix(lines.join('\n'));
		}
	}
}

function isFirstToken(node: AnonymousNode<any, any>) {
	return !node.prevToken;
}
