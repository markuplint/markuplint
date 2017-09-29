import * as parse5 from 'parse5';

export type Document = parse5.AST.HtmlParser2.Document;
export type ParentNode = parse5.AST.HtmlParser2.ParentNode;
export type Node = parse5.AST.HtmlParser2.Node;
export type Walker = (node: Node) => void;

export class NodeTree {

	private _raw: ParentNode[];

	constructor (nodeTree: ParentNode[]) {
		this._raw = nodeTree;
	}

	public walk (walker: Walker) {
		_walk(this._raw, walker);
	}
}

function _walk (nodeList: ParentNode[], walker: Walker) {
	for (const node of nodeList) {
		walker(node);
		if (node.childNodes && node.childNodes.length) {
			_walk(node.childNodes as ParentNode[], walker);
		}
	}
}

export default function parser (html: string) {
	const doc = parse5.parse(html, {locationInfo: true}) as Document;
	const nodeTree = new NodeTree(doc.childNodes as ParentNode[]);
	return nodeTree;
}