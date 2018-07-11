// import Element from './element';
// import GhostNode from './ghost-node';
// import Node from './node';
// import OmittedElement from './omitted-element';
// import TextNode from './text-node';
import { MLASTNode } from '@markuplint/ml-ast';

import Ruleset from '../ruleset/core';
import MLDOMDocument from './document';

// export type NodeType =
// 	| 'Node'
// 	| 'Element'
// 	| 'OmittedElement'
// 	| 'Text'
// 	| 'RawText'
// 	| 'Comment'
// 	| 'EndTag'
// 	| 'Doctype'
// 	| 'Invalid'
// 	| null;

namespace MLDOM {
	export type Document = MLDOMDocument;

	export function generate(astNodeList: MLASTNode[], ruleset: Ruleset) {
		return new MLDOMDocument(astNodeList, ruleset);
	}
}

export default MLDOM;

// // TODO: Refactoring for interfaces of location
// export interface Location {
// 	line: number | null;
// 	col: number | null;
// 	startOffset: number | null;
// 	endOffset: number | null;
// }

// export interface ExistentLocation {
// 	line: number;
// 	col: number;
// 	startOffset: number;
// 	endOffset: number;
// }

// export interface TagNodeLocation extends ExistentLocation {}

// export interface ElementLocation extends TagNodeLocation {
// 	startTag: TagNodeLocation;
// 	endTag: TagNodeLocation | null;
// }

// export type AmbiguousNode<T, O> = Node<T, O> | GhostNode<T, O> | null;
// export type ParentNode<T, O> = Element<T, O> | OmittedElement<T, O>;
