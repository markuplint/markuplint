import MLDOMText from './text';
import { RuleConfigValue } from '@markuplint/ml-config';

export default class MLDOMIndentation<T extends RuleConfigValue, O = null> {
	public readonly line: number;
	public readonly node: MLDOMText<T, O>;

	private readonly _originRaw: string;
	private _fixed: string;

	constructor(parentTextNode: MLDOMText<T, O>, raw: string, line: number) {
		this.node = parentTextNode;
		this.line = line;
		this._originRaw = raw;
		this._fixed = raw;
	}

	public get type(): 'tab' | 'space' | 'mixed' | 'none' {
		const raw = this._fixed;
		return raw === '' ? 'none' : /^\t+$/.test(raw) ? 'tab' : /^[^\t]+$/.test(raw) ? 'space' : 'mixed';
	}

	public get width() {
		return this._fixed.length;
	}

	public get raw() {
		return this._fixed;
	}

	public fix(raw: string) {
		const current = this._fixed;
		this._fixed = raw;
		if (this.node) {
			const node = this.node;
			const line = node.startLine;
			const lines = node.raw.split(/\r?\n/);
			const index = this.line - line;
			if (lines[index] != null) {
				lines[index] = lines[index].replace(current, this._fixed);
			}
			// console.log({ori: this._originRaw, raw, line, lines, index});
			node.fix(lines.join('\n'));
		}
	}
}
