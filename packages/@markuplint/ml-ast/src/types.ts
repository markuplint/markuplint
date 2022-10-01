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

export interface MLASTAbstractNode extends MLToken {
	type: MLASTNodeType;
	nodeName: string;
	parentNode: MLASTParentNode | null;
	prevNode: MLASTNode | null;
	nextNode: MLASTNode | null;
	isFragment: boolean;
	isGhost: boolean;
}

export interface MLASTDoctype extends MLASTAbstractNode {
	type: 'doctype';
	name: string;
	publicId: string;
	systemId: string;
}

export interface MLASTElement extends MLASTAbstractNode {
	type: 'starttag';
	namespace: string;
	elementType: ElementType;
	attributes: MLASTAttr[];
	hasSpreadAttr: boolean;
	childNodes?: MLASTNode[];
	pearNode: MLASTElementCloseTag | null;
	selfClosingSolidus?: MLToken;
	endSpace?: MLToken;
	tagOpenChar: string;
	tagCloseChar: string;
}

/**
 * Element type
 *
 * - `html`: From native HTML Standard
 * - `web-component`: As the Web Component according to HTML Standard
 * - `authored`:  Authored element (JSX Element etc.) through the view framework or the template engine.
 */
export type ElementType = 'html' | 'web-component' | 'authored';

export interface MLASTElementCloseTag extends MLASTAbstractNode {
	type: 'endtag';
	namespace: string;
	attributes: MLASTAttr[];
	childNodes?: MLASTNode[];
	pearNode: MLASTTag | null;
	tagOpenChar: string;
	tagCloseChar: string;
}

export interface MLASTPreprocessorSpecificBlock extends MLASTAbstractNode {
	type: 'psblock';
	nodeName: string;
	parentNode: MLASTParentNode | null;
	prevNode: MLASTNode | null;
	nextNode: MLASTNode | null;
	childNodes?: MLASTNode[];
	branchedChildNodes?: MLASTNode[];
}

export type MLASTTag = MLASTElement | MLASTElementCloseTag;

export type MLASTParentNode = MLASTElement | MLASTPreprocessorSpecificBlock;

export interface MLASTComment extends MLASTAbstractNode {
	type: 'comment';
}

export interface MLASTText extends MLASTAbstractNode {
	type: 'text';
}

export type MLASTAttr = MLASTHTMLAttr | MLASTPreprocessorSpecificAttr;

export interface MLASTHTMLAttr extends MLASTAbstractNode {
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

export interface MLASTPreprocessorSpecificAttr extends MLASTAbstractNode {
	type: 'ps-attr';
	potentialName: string;
	potentialValue: string;
	valueType: 'string' | 'number' | 'boolean' | 'code';
	isDuplicatable: boolean;
}

export interface MLASTDocument {
	nodeList: MLASTNode[];
	isFragment: boolean;
	unknownParseError?: string;
}

export interface MLMarkupLanguageParser {
	parse(
		sourceCode: string,
		options?: ParserOptions & {
			offsetOffset?: number;
			offsetLine?: number;
			offsetColumn?: number;
		},
	): MLASTDocument;

	/**
	 * @default "omittable"
	 */
	endTag?: EndTagType;

	/**
	 * Detect value as a true if its attribute is booleanish value and omitted.
	 *
	 * Ex:
	 * ```jsx
	 * <Component aria-hidden />
	 * ```
	 *
	 * In the above, the `aria-hidden` is `true`.
	 */
	booleanish?: boolean;
}

/**
 * The end tag omittable type.
 *
 * - `"xml"`: Must need an end tag or must self-close
 * - `"omittable"`: May omit
 * - `"never"`: Never need
 */
export type EndTagType = 'xml' | 'omittable' | 'never';

export type ParserOptions = {
	ignoreFrontMatter?: boolean;
	authoredElementName?: ParserAuthoredElementNameDistinguishing;
};

export type ParserAuthoredElementNameDistinguishing =
	| string
	| RegExp
	| ParserAuthoredElementNameDistinguishingFunction
	| (string | RegExp | ParserAuthoredElementNameDistinguishingFunction)[];

export type ParserAuthoredElementNameDistinguishingFunction = (name: string) => boolean;

export type Parse = MLMarkupLanguageParser['parse'];

export type Walker = (node: MLASTNode, depth: number) => void;

export type NamespaceURI =
	| 'http://www.w3.org/1999/xhtml'
	| 'http://www.w3.org/2000/svg'
	| 'http://www.w3.org/1998/Math/MathML'
	| 'http://www.w3.org/1999/xlink';

export type Namespace = 'html' | 'svg' | 'mml' | 'xlink';
