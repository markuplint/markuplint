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
	Doctype = 'doctype',
	StartTag = 'starttag',
	EndTag = 'endtag',
	Comment = 'comment',
	Text = 'text',
	InvalidNode = 'invalidnode',
	OmittedTag = 'omittedtag',
}

export type MLASTNode = MLASTDoctype | MLASTTag | MLASTComment | MLASTText | MLASTInvalidNode;

export interface MLASTAbstructNode extends MLToken {
	type: MLASTNodeType;
	nodeName: string;
	parentNode: MLASTParentNode | null;
	prevNode: MLASTNode | null;
	nextNode: MLASTNode | null;
	isFragment: boolean;
	isGhost: boolean;
}

export interface MLASTDoctype extends MLASTAbstructNode {
	type: MLASTNodeType.Doctype;
}

export interface MLASTElement extends MLASTAbstructNode {
	type: MLASTNodeType.StartTag;
	namespace: string;
	attributes: MLASTAttr[];
	childNodes?: MLASTNode[];
	pearNode: MLASTTag | null;
}

export interface MLASTElementCloseTag extends MLASTAbstructNode {
	type: MLASTNodeType.EndTag;
	namespace: string;
	attributes: MLASTAttr[];
	childNodes?: MLASTNode[];
	pearNode: MLASTTag | null;
}

export interface MLASTOmittedElement extends MLASTAbstructNode {
	type: MLASTNodeType.OmittedTag;
	namespace: string;
	childNodes?: MLASTNode[];
}

export type MLASTTag = MLASTElement | MLASTElementCloseTag | MLASTOmittedElement;

export type MLASTParentNode = MLASTElement | MLASTOmittedElement;

export interface MLASTComment extends MLASTAbstructNode {
	type: MLASTNodeType.Comment;
}

export interface MLASTText extends MLASTAbstructNode {
	type: MLASTNodeType.Text;
}

export interface MLASTInvalidNode extends MLASTAbstructNode {
	type: MLASTNodeType.InvalidNode;
}

export interface MLASTAttr extends MLToken {
	name: MLToken;
	// beforeSpaces: MLToken | null;
	spacesBeforeEqual: MLToken | null;
	equal: MLToken | null;
	spacesAfterEqual: MLToken | null;
	tokenBeforeValue: MLToken | null;
	value: MLToken | null;
	tokenAfterValue: MLToken | null;
	isInvalid: boolean;
}

export interface MLMarkupLanguageParser {
	(sourceCode: string): MLASTNode[];
}
