export interface MLToken {
	uuid: string;
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
	OmittedTag = 'omittedtag',
}

export type MLASTNode = MLASTDoctype | MLASTTag | MLASTComment | MLASTText;

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
	name: string;
	publicId: string;
	systemId: string;
}

export interface MLASTElement extends MLASTAbstructNode {
	type: MLASTNodeType.StartTag;
	namespace: string;
	attributes: MLASTAttr[];
	childNodes?: MLASTNode[];
	pearNode: MLASTElementCloseTag | null;
	selfClosingSolidus: MLToken;
	endSpace: MLToken;
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

export interface MLASTAttr extends MLToken {
	spacesBeforeName: MLToken;
	name: MLToken;
	spacesBeforeEqual: MLToken;
	equal: MLToken;
	spacesAfterEqual: MLToken;
	startQuote: MLToken;
	value: MLToken;
	endQuote: MLToken;
	isInvalid: boolean;
}

export interface MLASTDocument {
	nodeList: MLASTNode[];
	isFragment: boolean;
}

export interface MLMarkupLanguageParser {
	parse(sourceCode: string): MLASTDocument;
}
