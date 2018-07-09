export interface MLToken {
	raw: string;
	startOffset: number;
	endOffset: number;
	startLine: number;
	endLine: number;
	startCol: number;
	endCol: number;
}

export enum MLASTNodeType {
	Doctype,
	StartTag,
	EndTag,
	Comment,
	Text,
	InvalidNode,
}

export interface MLASTNode extends MLToken {
	type: MLASTNodeType;
	nodeName: string;
	parentNode: MLASTNode | null;
	prevNode: MLASTNode | null;
	nextNode: MLASTNode | null;
	isFragment: boolean;
	isGhost: boolean;
}

export interface MLASTTag extends MLASTNode {
	type: MLASTNodeType.StartTag | MLASTNodeType.EndTag;
	namespace: string;
	attributes: MLASTAttr[];
	childNodes?: MLASTNode[];
	pearNode: MLASTTag | null;
}

export interface MLASTAttr extends MLToken {
	name: MLToken;
	spacesBeforeEqual: MLToken;
	equal: MLToken | null;
	spacesAfterEqual: MLToken;
	tokenBeforeValue: MLToken | null;
	value: MLToken | null;
	tokenAfterValue: MLToken | null;
	isInvalid: boolean;
}
