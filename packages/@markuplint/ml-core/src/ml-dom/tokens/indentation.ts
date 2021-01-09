import MLDOMNode from './node';
import MLDOMText from './text';
import { RuleConfigValue } from '@markuplint/ml-config';

export default class MLDOMIndentation<T extends RuleConfigValue, O = null> {
	readonly line: number;
	readonly node: MLDOMText<T, O>;
	readonly parent: MLDOMNode<T, O>;

	// readonly #originRaw: string;
	#fixed: string;

	constructor(originTextNode: MLDOMText<T, O>, raw: string, line: number, parentNode: MLDOMNode<T, O>) {
		this.node = originTextNode;
		this.parent = parentNode;
		this.line = line;
		// this.#originRaw = raw;
		this.#fixed = raw;
	}

	get type(): 'tab' | 'space' | 'mixed' | 'none' {
		if (this.parent.type !== 'Text' && this.line !== this.node.endLine) {
			return 'none';
		}
		const raw = this.#fixed;
		return raw === '' ? 'none' : /^\t+$/.test(raw) ? 'tab' : /^[^\t]+$/.test(raw) ? 'space' : 'mixed';
	}

	get width() {
		if (this.parent.type !== 'Text' && this.line !== this.node.endLine) {
			return 0;
		}
		return this.#fixed.length;
	}

	get raw() {
		if (this.parent.type !== 'Text' && this.line !== this.node.endLine) {
			return '';
		}
		return this.#fixed;
	}

	fix(raw: string) {
		const current = this.#fixed;
		this.#fixed = raw;
		if (this.node) {
			const node = this.node;
			const line = node.startLine;
			const lines = node.raw.split(/\r?\n/);
			const index = this.line - line;
			if (lines[index] != null) {
				lines[index] = lines[index].replace(current, this.#fixed);
			}
			// console.log({ori: this._originRaw, raw, line, lines, index});
			node.fix(lines.join('\n'));
		}
	}
}
