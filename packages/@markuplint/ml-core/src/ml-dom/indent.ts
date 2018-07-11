// export class Indent<T, O> {
// 	public readonly line: number;
// 	public readonly parentTextNode: TextNode<T, O> | null;

// 	private readonly _originRaw: string;
// 	private _fixed: string;

// 	constructor(parentTextNode: TextNode<T, O> | null, raw: string, line: number) {
// 		this.parentTextNode = parentTextNode;
// 		this.line = line;
// 		this._originRaw = raw;
// 		this._fixed = raw;
// 	}

// 	public get type(): 'tab' | 'space' | 'mixed' | 'none' {
// 		const raw = this._fixed;
// 		return raw === '' ? 'none' : /^\t+$/.test(raw) ? 'tab' : /^[^\t]+$/.test(raw) ? 'space' : 'mixed';
// 	}

// 	public get width() {
// 		return this._fixed.length;
// 	}

// 	public get raw() {
// 		return this._fixed;
// 	}

// 	public fix(raw: string) {
// 		const current = this._fixed;
// 		this._fixed = raw;
// 		if (this.node) {
// 			const node = this.node;
// 			const line = node.line;
// 			const lines = node.raw.split(/\r?\n/);
// 			const index = this.line - line;
// 			if (lines[index] != null) {
// 				lines[index] = lines[index].replace(current, this._fixed);
// 			}
// 			// console.log({ori: this._originRaw, raw, line, lines, index});
// 			node.fix(lines.join('\n'));
// 		}
// 	}
// }
