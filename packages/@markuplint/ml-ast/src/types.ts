export interface MLToken {
	readonly uuid: string;
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
	readonly type: MLASTNodeType;
	nodeName: string;
	parentNode: MLASTParentNode | null;
	prevNode: MLASTNode | null;
	nextNode: MLASTNode | null;
	isFragment: boolean;
	isGhost: boolean;
}

export interface MLASTDoctype extends MLASTAbstractNode {
	readonly type: 'doctype';
	name: string;
	readonly publicId: string;
	readonly systemId: string;
}

export interface MLASTElement extends MLASTAbstractNode {
	readonly type: 'starttag';
	namespace: string;
	elementType: ElementType;
	attributes: MLASTAttr[];
	hasSpreadAttr: boolean;
	childNodes?: MLASTNode[];
	pearNode: MLASTElementCloseTag | null;
	readonly selfClosingSolidus?: MLToken;
	readonly endSpace?: MLToken;
	readonly tagOpenChar: string;
	readonly tagCloseChar: string;
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
	readonly type: 'endtag';
	readonly namespace: string;
	attributes: MLASTAttr[];
	childNodes?: MLASTNode[];
	pearNode: MLASTTag | null;
	readonly tagOpenChar: string;
	readonly tagCloseChar: string;
}

export interface MLASTPreprocessorSpecificBlock extends MLASTAbstractNode {
	readonly type: 'psblock';
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
	readonly type: 'comment';
}

export interface MLASTText extends MLASTAbstractNode {
	readonly type: 'text';
}

export type MLASTAttr = MLASTHTMLAttr | MLASTPreprocessorSpecificAttr;

export interface MLASTHTMLAttr extends MLASTAbstractNode {
	readonly type: 'html-attr';
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
	potentialValue?: string;
	candidate?: string;
	isDuplicatable: boolean;
	parentNode: null;
	nextNode: null;
	prevNode: null;
	isFragment: false;
	isGhost: false;
}

export interface MLASTPreprocessorSpecificAttr extends MLASTAbstractNode {
	readonly type: 'ps-attr';
	readonly potentialName: string;
	readonly potentialValue: string;
	readonly valueType: 'string' | 'number' | 'boolean' | 'code';
	isDuplicatable: boolean;
}

export interface MLASTDocument {
	nodeList: MLASTNode[];
	readonly isFragment: boolean;
	unknownParseError?: string;
}

export interface MLMarkupLanguageParser {
	parse(
		sourceCode: string,
		options?: ParserOptions & {
			readonly offsetOffset?: number;
			readonly offsetLine?: number;
			readonly offsetColumn?: number;
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
	readonly ignoreFrontMatter?: boolean;
	readonly authoredElementName?: ParserAuthoredElementNameDistinguishing;
};

export type ParserAuthoredElementNameDistinguishing =
	| string
	| Readonly<RegExp>
	| Readonly<ParserAuthoredElementNameDistinguishingFunction>
	| readonly (string | Readonly<RegExp> | ParserAuthoredElementNameDistinguishingFunction)[];

export type ParserAuthoredElementNameDistinguishingFunction = (name: string) => boolean;

export type Parse = MLMarkupLanguageParser['parse'];

export type Walker = (
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	node: MLASTNode,
	depth: number,
) => void;

export type NamespaceURI =
	| 'http://www.w3.org/1999/xhtml'
	| 'http://www.w3.org/2000/svg'
	| 'http://www.w3.org/1998/Math/MathML'
	| 'http://www.w3.org/1999/xlink';

export type Namespace = 'html' | 'svg' | 'mml' | 'xlink';
