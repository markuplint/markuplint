export default class Indentation<T, O> {
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
}

// for (const node of this._list) {
// 	if (node instanceof Node) {
// 		/**
// 		 * Indentation of TextNode
// 		 */
// 		if (node instanceof TextNode) {
// 			const textNode = node;
// 			if (!(node instanceof RawText)) {
// 				const matched = node.raw.match(/^(\s*(?:\r?\n)+\s*)(?:[^\s]+)/);
// 				if (matched) {
// 					const spaces = matched[1];
// 					if (spaces) {
// 						const spaceLines = spaces.split(/\r?\n/);
// 						const line = spaceLines.length + node.line - 1;
// 						const lastSpace = spaceLines.pop();
// 						if (lastSpace != null) {
// 							node.indentation = new Indentation(node, lastSpace, line);
// 						}
// 					}
// 				}
// 			}
// 			/**
// 			 * Indentation of Element etc.
// 			 */
// 		} else if (node.prevSyntaxicalNode instanceof TextNode) {
// 			const prevSyntaxicalTextNode: TextNode<T, O> = node.prevSyntaxicalNode;

// 			if (!(prevSyntaxicalTextNode instanceof RawText)) {
// 				const matched = prevSyntaxicalTextNode.raw.match(/\r?\n([ \t]*)$/);
// 				if (matched) {
// 					const spaces = matched[1];
// 					if (spaces != null) {
// 						node.indentation = new Indentation(prevSyntaxicalTextNode, spaces, node.line);
// 					}
// 				} else if (
// 					node.prevNode &&
// 					node.prevNode instanceof Node &&
// 					node.prevNode.location.startOffset === 0
// 				) {
// 					const spaces = node.prevNode.raw;
// 					node.indentation = new Indentation(prevSyntaxicalTextNode, spaces, node.line);
// 				}
// 			}
// 		} else if (node.location.startOffset === 0) {
// 			node.indentation = new Indentation(null, '', node.line);
// 			// node.indentation = {
// 			// 	type: 'none',
// 			// 	width: 0,
// 			// 	raw: '',
// 			// 	line: node.line,
// 			// };
// 		}
// 	}
// }
