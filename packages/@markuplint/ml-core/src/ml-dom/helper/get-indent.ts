import type { MLNode } from '../node/node.js';
import type { MLText } from '../node/text.js';

/**
 *
 * @deprecated
 * @param node
 */
export function getIndent(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	node: MLNode<any, any>,
) {
	const prevToken = node.prevToken;
	if (!prevToken) {
		return null;
	}

	if (node.is(node.TEXT_NODE)) {
		if (node.isRawTextElementContent()) {
			return null;
		}

		const matched = node.raw.match(
			/^([\t\v\f\r \u00A0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000\uFEFF]*\n\s*)\S+/,
		);
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

	if (!prevToken.is(node.TEXT_NODE)) {
		return null;
	}

	// One or more newlines and zero or more spaces or tabs.
	// Or, If textNode is first token and that is filled spaces, tabs and newlines only.
	const matched = isFirstToken(prevToken)
		? prevToken.raw.match(/^(?:[\t ]*\r?\n)*([\t ]*)$/)
		: prevToken.raw.match(/\r?\n([\t ]*)$/);
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
	#fixed: string;
	readonly line: number;
	#node: MLText<any, any>;
	#parent: MLNode<any, any>;

	constructor(
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		originTextNode: MLText<any, any>,
		raw: string,
		line: number,
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		parentNode: MLNode<any, any>,
	) {
		this.line = line;
		this.#node = originTextNode;
		this.#parent = parentNode;
		this.#fixed = raw;
	}

	get raw() {
		if (!this.#parent.is(this.#parent.TEXT_NODE) && this.line !== this.#node.endLine) {
			return '';
		}
		return this.#fixed;
	}

	get type(): 'tab' | 'space' | 'mixed' | 'none' {
		if (!this.#parent.is(this.#parent.TEXT_NODE) && this.line !== this.#node.endLine) {
			return 'none';
		}
		const raw = this.#fixed;
		return raw === '' ? 'none' : /^\t+$/.test(raw) ? 'tab' : /^[^\t]+$/.test(raw) ? 'space' : 'mixed';
	}

	get width() {
		if (!this.#parent.is(this.#parent.TEXT_NODE) && this.line !== this.#node.endLine) {
			return 0;
		}
		return this.#fixed.length;
	}

	fix(raw: string) {
		const current = this.#fixed;
		this.#fixed = raw;

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

function isFirstToken(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	node: MLNode<any, any>,
) {
	return !node.prevToken;
}
