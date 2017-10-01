import * as parse5 from 'parse5';

export type P5Document = parse5.AST.HtmlParser2.Document;
export type P5ParentNode =
	parse5.AST.HtmlParser2.ParentNode
	&
	{
		nodeName: string;
		__location: {
			line: number;
			col: number;
			startOffset: number;
			endOffeset: number;
		};
	};
export type P5Node = parse5.AST.HtmlParser2.Node;
export type Walker = (node: Node) => void;

interface _DOCUMENT_TYPE extends P5ParentNode {
	publicId: string | null;
	systemId: string | null;
}

export class Node {
	public readonly nodeName: string;
	public readonly line: number;
	public readonly s: number;

	constructor (node: P5ParentNode) {
		this.nodeName = node.nodeName;
		// console.log(node);
	}
}

export class Doctype extends Node {
	public readonly publicId: string | null;
	public readonly dtd: string | null;
	constructor (node: P5ParentNode) {
		super(node);
		this.publicId = (node as _DOCUMENT_TYPE).publicId;
		this.dtd = (node as _DOCUMENT_TYPE).systemId;
	}
}

export class NodeTree {

	private _docType: Doctype;

	private _: Node[] = [];

	constructor (nodeTree: P5ParentNode[]) {
		_walk(nodeTree, (n) => {
			switch (n.nodeName) {
				case '#documentType': {
					this._docType = new Doctype(n);
					this._.push(this._docType);
					break;
				}
				default: {
					if (n.__location && !isNaN(n.__location.col)) {
						this._.push(new Node(n));
					}
				}
			}
		});
	}

	public walk (walker: Walker) {
		for (const node of this._) {
			walker(node);
		}
	}

	public getNode (index: number): Node | null {
		return this._[index];
	}
}

function _walk<N extends {childNodes: (N | any)[]}> (nodeList: N[], walker: (node: N) => void) {
	for (const node of nodeList) {
		walker(node);
		if (node.childNodes && node.childNodes.length) {
			_walk(node.childNodes, walker);
		}
	}
}

export default function parser (html: string) {
	const doc = parse5.parse(html, {locationInfo: true}) as P5Document;
	const nodeTree = new NodeTree(doc.childNodes as P5ParentNode[]);
	return nodeTree;
}
