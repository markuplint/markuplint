export interface MLToken {
	uuid: string;
	raw: string;
	startOffset: number;
	endOffset: number;
	startLine: number;
	endLine: number;
	startCol: number;
	endCol: number;
	[extendKey: `__${string}`]: string | number | boolean | null;
}

export type MLASTNodeType =
	| 'doctype'
	| 'starttag'
	| 'endtag'
	| 'comment'
	| 'text'
	| 'omittedtag'
	| 'psblock'
	| 'html-attr'
	| 'ps-attr';

export type MLASTNode = MLASTDoctype | MLASTTag | MLASTComment | MLASTText | MLASTPreprocessorSpecificBlock | MLASTAttr;

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
	type: 'doctype';
	name: string;
	publicId: string;
	systemId: string;
}

export interface MLASTElement extends MLASTAbstructNode {
	type: 'starttag';
	namespace: string;
	attributes: MLASTAttr[];
	hasSpreadAttr: boolean;
	childNodes?: MLASTNode[];
	pearNode: MLASTElementCloseTag | null;
	selfClosingSolidus?: MLToken;
	endSpace?: MLToken;
	tagOpenChar: string;
	tagCloseChar: string;
	isCustomElement: boolean;
}

export interface MLASTElementCloseTag extends MLASTAbstructNode {
	type: 'endtag';
	namespace: string;
	attributes: MLASTAttr[];
	childNodes?: MLASTNode[];
	pearNode: MLASTTag | null;
	tagOpenChar: string;
	tagCloseChar: string;
	isCustomElement: boolean;
}

export interface MLASTOmittedElement extends MLASTAbstructNode {
	type: 'omittedtag';
	namespace: string;
	childNodes?: MLASTNode[];
	isCustomElement: boolean;
}

export interface MLASTPreprocessorSpecificBlock extends MLASTAbstructNode {
	type: 'psblock';
	nodeName: string;
	parentNode: MLASTParentNode | null;
	prevNode: MLASTNode | null;
	nextNode: MLASTNode | null;
	childNodes?: MLASTNode[];
	branchedChildNodes?: MLASTNode[];
}

export type MLASTTag = MLASTElement | MLASTElementCloseTag | MLASTOmittedElement;

export type MLASTParentNode = MLASTElement | MLASTOmittedElement | MLASTPreprocessorSpecificBlock;

export interface MLASTComment extends MLASTAbstructNode {
	type: 'comment';
}

export interface MLASTText extends MLASTAbstructNode {
	type: 'text';
}

export type MLASTAttr = MLASTHTMLAttr | MLASTPreprocessorSpecificAttr;

export interface MLASTHTMLAttr extends MLASTAbstructNode {
	type: 'html-attr';
	spacesBeforeName: MLToken;
	name: MLToken;
	spacesBeforeEqual: MLToken;
	equal: MLToken;
	spacesAfterEqual: MLToken;
	startQuote: MLToken;
	value: MLToken;
	endQuote: MLToken;
	isDynamicValue?: true;
	isDirective?: true;
	potentialName?: string;
	candidate?: string;
	isDuplicatable: boolean;
	parentNode: null;
	nextNode: null;
	prevNode: null;
	isFragment: false;
	isGhost: false;
}

export interface MLASTPreprocessorSpecificAttr extends MLASTAbstructNode {
	type: 'ps-attr';
	potentialName: string;
	potentialValue: string;
	valueType: 'string' | 'number' | 'boolean' | 'code';
	isDuplicatable: boolean;
}

export interface MLASTDocument {
	nodeList: MLASTNode[];
	isFragment: boolean;
	unkownParseError?: string;
}

export interface MLMarkupLanguageParser {
	parse(
		sourceCode: string,
		offsetOffset?: number,
		offsetLine?: number,
		offsetColumn?: number,
		ignoreFrontMatter?: boolean,
	): MLASTDocument;
	tagNameCaseSensitive?: boolean;
	/**
	 * @default "omittable"
	 */
	endTag?: 'xml' | 'omittable' | 'never';
}

export type Parse = MLMarkupLanguageParser['parse'];

export type Walker = (node: MLASTNode, depth: number) => void;

export type NamespaceURI =
	| 'http://www.w3.org/1999/xhtml'
	| 'http://www.w3.org/2000/svg'
	| 'http://www.w3.org/1998/Math/MathML';
