export type MLASTNodeType =
	| 'doctype'
	| 'starttag'
	| 'endtag'
	| 'comment'
	| 'text'
	| 'omittedtag'
	| 'psblock'
	| 'invalid'
	| 'attr'
	| 'spread';

/**
 * Element type
 *
 * - `html`: From native HTML Standard
 * - `web-component`: As the Web Component according to HTML Standard
 * - `authored`:  Authored element (JSX Element etc.) through the view framework or the template engine.
 */
export type ElementType = 'html' | 'web-component' | 'authored';

export type MLASTNode =
	| MLASTDoctype
	| MLASTTag
	| MLASTComment
	| MLASTText
	| MLASTPreprocessorSpecificBlock
	| MLASTInvalid
	| MLASTAttr;

export type MLASTParentNode = MLASTElement | MLASTPreprocessorSpecificBlock;

export type MLASTNodeTreeItem = MLASTChildNode | MLASTDoctype;

export type MLASTChildNode = MLASTTag | MLASTText | MLASTComment | MLASTPreprocessorSpecificBlock | MLASTInvalid;

export type MLASTTag = MLASTElement | MLASTElementCloseTag;

export type MLASTAttr = MLASTHTMLAttr | MLASTSpreadAttr;

export interface MLASTToken {
	readonly uuid: string;
	readonly raw: string;
	readonly offset: number;
	readonly line: number;
	readonly col: number;
}

interface MLASTAbstractNode extends MLASTToken {
	readonly type: MLASTNodeType;
	readonly nodeName: string;
	readonly parentNode: MLASTParentNode | null;
}

export interface MLASTDoctype extends MLASTAbstractNode {
	readonly type: 'doctype';
	readonly depth: number;
	readonly name: string;
	readonly publicId: string;
	readonly systemId: string;
}

export interface MLASTElement extends MLASTAbstractNode {
	readonly type: 'starttag';
	readonly depth: number;
	readonly namespace: string;
	readonly elementType: ElementType;
	readonly isFragment: boolean;
	readonly attributes: readonly MLASTAttr[];
	readonly hasSpreadAttr?: boolean;
	readonly childNodes: readonly MLASTChildNode[];
	readonly pairNode: MLASTElementCloseTag | null;
	readonly tagOpenChar: string;
	readonly tagCloseChar: string;
	readonly isGhost: boolean;
}

export interface MLASTElementCloseTag extends MLASTAbstractNode {
	readonly type: 'endtag';
	readonly depth: number;
	readonly parentNode: null;
	readonly pairNode: MLASTElement;
	readonly tagOpenChar: string;
	readonly tagCloseChar: string;
}

export interface MLASTPreprocessorSpecificBlock extends MLASTAbstractNode {
	readonly type: 'psblock';
	readonly conditionalType: MLASTBlockBehaviorType;
	readonly depth: number;
	readonly nodeName: string;
	readonly isFragment: boolean;
	readonly childNodes: readonly MLASTChildNode[];
	readonly isBogus: boolean;
}

export type MLASTBlockBehaviorType =
	| 'if'
	| 'if:elseif'
	| 'if:else'
	| 'switch:case'
	| 'switch:default'
	| 'each'
	| 'each:empty'
	| 'await'
	| 'await:then'
	| 'await:catch'
	| 'end'
	| null;

export interface MLASTComment extends MLASTAbstractNode {
	readonly type: 'comment';
	readonly nodeName: '#comment';
	readonly depth: number;
	readonly isBogus: boolean;
}

export interface MLASTText extends MLASTAbstractNode {
	readonly type: 'text';
	readonly nodeName: '#text';
	readonly depth: number;
}

export interface MLASTInvalid extends MLASTAbstractNode {
	readonly type: 'invalid';
	readonly nodeName: '#invalid';
	readonly depth: number;
	readonly kind?: Exclude<MLASTChildNode['type'], 'invalid'>;
	readonly isBogus: true;
}

export interface MLASTHTMLAttr extends MLASTToken {
	readonly type: 'attr';
	readonly nodeName: string;
	readonly spacesBeforeName: MLASTToken;
	readonly name: MLASTToken;
	readonly spacesBeforeEqual: MLASTToken;
	readonly equal: MLASTToken;
	readonly spacesAfterEqual: MLASTToken;
	readonly startQuote: MLASTToken;
	readonly value: MLASTToken;
	readonly endQuote: MLASTToken;
	readonly isDynamicValue?: true;
	readonly isDirective?: true;
	readonly potentialName?: string;
	readonly potentialValue?: string;
	readonly valueType?: 'string' | 'number' | 'boolean' | 'code';
	readonly candidate?: string;
	readonly isDuplicatable: boolean;
}

export interface MLASTSpreadAttr extends MLASTToken {
	readonly type: 'spread';
	readonly nodeName: '#spread';
}

export interface MLASTDocument {
	readonly raw: string;
	readonly nodeList: readonly MLASTNodeTreeItem[];
	readonly isFragment: boolean;
	readonly unknownParseError?: string;
}

export interface MLParser {
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

	tagNameCaseSensitive?: boolean;
}

export interface MLParserModule {
	readonly parser: MLParser;
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

export type Walker<Node extends MLASTNodeTreeItem> = (
	node: Node,
	sequentailPrevNode: MLASTNodeTreeItem | null,
	depth: number,
) => void;

export type NamespaceURI =
	| 'http://www.w3.org/1999/xhtml'
	| 'http://www.w3.org/2000/svg'
	| 'http://www.w3.org/1998/Math/MathML'
	| 'http://www.w3.org/1999/xlink';

export type Namespace = 'html' | 'svg' | 'mml' | 'xlink';
