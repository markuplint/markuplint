export type AdditionalASTData = {
	raw: string;
	offset: number;
	endOffset: number;
	endLine: number;
	endColumn: number;
};

export type ASTNode =
	| ASTDoctype
	| ASTComment
	| ASTBlockComment
	| ASTText
	| ASTTag
	| ASTInterpolatedTag
	| ASTCode
	| ASTConditional
	| ASTCase
	| ASTWhen
	| ASTWhile
	| ASTEach
	| ASTMixin
	| ASTMixinBlock
	| ASTYieldBlock
	| ASTFileReference
	| ASTInclude
	| ASTRawInclude
	| ASTIncludeFilter
	| ASTExtends
	| ASTNamedBlock
	| ASTFilter;

export type ASTBlock = {
	type: 'Block';
	nodes: readonly ASTNode[];
	line: number;
};

export type ASTDoctype = PugAST.Doctype & AdditionalASTData;

export type ASTComment = PugAST.Comments.Comment & AdditionalASTData;

export type ASTBlockComment = Omit<PugAST.Comments.BlockComment, 'block'> & {
	block: ASTBlock | null;
} & AdditionalASTData;

export type ASTText = PugAST.Text & AdditionalASTData;

export type ASTTag = Omit<PugAST.Tag, 'attrs' | 'block'> & {
	attrs: readonly ASTAttr[];
	block: ASTBlock | null;
} & AdditionalASTData;

export type ASTInterpolatedTag = Omit<PugAST.InterpolatedTag, 'block'> & {
	block: ASTBlock | null;
} & AdditionalASTData;

export type ASTCode = Omit<PugAST.Code, 'block'> & {
	block: ASTBlock | null;
} & AdditionalASTData;

export type ASTConditional = Omit<PugAST.CodeHelpers.Conditional, 'consequent' | 'alternate'> & {
	block: ASTBlock | null;
} & AdditionalASTData;

export type ASTCase = Omit<PugAST.CodeHelpers.CaseWhen.Case, 'block'> & {
	block: ASTBlock | null;
} & AdditionalASTData;

export type ASTWhen = Omit<PugAST.CodeHelpers.CaseWhen.When, 'block'> & {
	block: ASTBlock | null;
} & AdditionalASTData;

export type ASTWhile = PugAST.While & AdditionalASTData;

export type ASTEach = Omit<PugAST.Each, 'block' | 'alternate'> & {
	block: ASTBlock | null;
} & AdditionalASTData;

export type ASTMixin = Omit<PugAST.Mixin, 'block'> & {
	block: ASTBlock | null;
} & AdditionalASTData;

export type ASTMixinBlock = PugAST.MixinBlock & AdditionalASTData;

export type ASTYieldBlock = PugAST.YieldBlock & AdditionalASTData;

export type ASTFileReference = PugAST.FileOperations.FileReference & AdditionalASTData;

export type ASTInclude = Omit<PugAST.FileOperations.Include, 'block'> & {
	block: ASTBlock | null;
} & AdditionalASTData;

export type ASTRawInclude = PugAST.FileOperations.RawInclude & AdditionalASTData;

export type ASTIncludeFilter = PugAST.FileOperations.IncludeFilter & AdditionalASTData;

export type ASTExtends = PugAST.FileOperations.Extends & AdditionalASTData;

export type ASTNamedBlock = Omit<PugAST.FileOperations.NamedBlock, 'nodes'> & {
	nodes: readonly ASTNode[];
} & AdditionalASTData;

export type ASTFilter = Omit<PugAST.Filter, 'block'> & {
	block: ASTBlock | null;
} & AdditionalASTData;

export type ASTAttr = PugAST.AbstractNodeTypes.Attribute & AdditionalASTData;

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace PugAST {
	/**
	 * Node objects
	 *
	 * @see https://github.com/pugjs/pug-ast-spec/blob/master/parser.md#node-objects
	 */
	interface _Node {
		type: string;
		line: number; // line number of the start position of the node
		column: number | null; // column number at the starting position of the node
		filename: string | null; // the name of the file the node originally belongs to
	}

	/**
	 * Block
	 *
	 * @see https://github.com/pugjs/pug-ast-spec/blob/master/parser.md#blocks
	 */
	export interface Block extends _Node {
		type: 'Block';
		nodes: Node[];
	}

	/**
	 * Abstract Node Types
	 *
	 * @see https://github.com/pugjs/pug-ast-spec/blob/master/parser.md#abstract-node-types
	 */
	// eslint-disable-next-line @typescript-eslint/no-namespace
	export namespace AbstractNodeTypes {
		export interface AttributedNode extends _Node {
			attrs: Attribute[]; // all the individual attributes of the node

			// Original Definition
			// attributeBlocks: JavaScriptExpression[]; // all the &attributes expressions effective on this node

			// Extended
			attributeBlocks: AttributeBlock[];
		}

		export interface BlockNode extends _Node {
			block: Block | null;
		}

		export interface ExpressionNode extends _Node {
			expr: JavaScriptExpression;
		}

		export interface PlaceholderNode extends _Node {}

		export interface ValueNode extends _Node {
			val: string;
		}

		export interface Attribute {
			name: string; // the name of the attribute
			val: JavaScriptExpression; // JavaScript expression returning the value of the attribute
			mustEscape: boolean; // if the value must be HTML-escaped before being buffered

			// Extended
			line: number;
			column: number;
		}

		export type JavaScriptExpression = string & {};
		export type JavaScriptIdentifier = string & {};

		// Extended
		export interface AttributeBlock {
			type: 'AttributeBlock';
			val: JavaScriptExpression;
			line: number;
			column: number;
		}
	}

	/**
	 * Doctypes
	 *
	 * https://github.com/pugjs/pug-ast-spec/blob/master/parser.md#doctypes
	 */
	export interface Doctype extends _Node {
		type: 'Doctype';
	}

	/**
	 * Comments
	 *
	 * @see https://github.com/pugjs/pug-ast-spec/blob/master/parser.md#comments
	 */
	// eslint-disable-next-line @typescript-eslint/no-namespace
	export namespace Comments {
		interface CommonComment extends AbstractNodeTypes.ValueNode {
			buffer: boolean; // whether the comment should appear when rendered
		}

		export interface Comment extends CommonComment {
			type: 'Comment';
		}

		export interface BlockComment extends AbstractNodeTypes.BlockNode, CommonComment {
			type: 'BlockComment';
		}
	}

	/**
	 * Text
	 *
	 * @see https://github.com/pugjs/pug-ast-spec/blob/master/parser.md#text
	 */
	export interface Text extends AbstractNodeTypes.ValueNode {
		type: 'Text';
	}

	/**
	 * Tag
	 *
	 * @see https://github.com/pugjs/pug-ast-spec/blob/master/parser.md#tag
	 */
	export interface CommonTag extends AbstractNodeTypes.AttributedNode, AbstractNodeTypes.BlockNode {
		selfClosing: boolean; // if the tag is explicitly stated as self-closing
		isInline: boolean; // if the tag is defined as an inline tag as opposed to a block-level tag
	}

	/**
	 * Regular Tag
	 *
	 * @see https://github.com/pugjs/pug-ast-spec/blob/master/parser.md#regular-tag
	 */
	export interface Tag extends CommonTag {
		type: 'Tag';
		name: string; // the name of the tag
	}

	/**
	 * Interpolated Tag
	 *
	 * @see https://github.com/pugjs/pug-ast-spec/blob/master/parser.md#interpolated-tag
	 */
	export interface InterpolatedTag extends CommonTag, AbstractNodeTypes.ExpressionNode {
		type: 'InterpolatedTag';
	}

	/**
	 * Code
	 *
	 * @see https://github.com/pugjs/pug-ast-spec/blob/master/parser.md#code
	 */
	export interface Code extends AbstractNodeTypes.BlockNode, AbstractNodeTypes.ValueNode {
		type: 'Code';
		buffer: boolean; // if the value of the piece of code is buffered in the template
		mustEscape: boolean; // if the value must be HTML-escaped before being buffered
		isInline: boolean; // whether the node is the result of a string interpolation
	}

	/**
	 * Code Helpers
	 *
	 * @see https://github.com/pugjs/pug-ast-spec/blob/master/parser.md#code-helpers
	 */
	// eslint-disable-next-line @typescript-eslint/no-namespace
	export namespace CodeHelpers {
		/**
		 * Conditional
		 *
		 * @see https://github.com/pugjs/pug-ast-spec/blob/master/parser.md#conditional
		 */
		export interface Conditional extends _Node {
			type: 'Conditional';
			test: AbstractNodeTypes.JavaScriptExpression;
			consequent: Block;
			alternate: Conditional | Block | null;
		}

		/**
		 * Case/When
		 *
		 * @see https://github.com/pugjs/pug-ast-spec/blob/master/parser.md#casewhen
		 */
		// eslint-disable-next-line @typescript-eslint/no-namespace
		export namespace CaseWhen {
			export interface Case extends AbstractNodeTypes.BlockNode, AbstractNodeTypes.ExpressionNode {
				type: 'Case';
				block: WhenBlock;
			}

			interface WhenBlock extends Block {}

			export interface When extends AbstractNodeTypes.BlockNode, AbstractNodeTypes.ExpressionNode {
				type: 'When';
				expr: AbstractNodeTypes.JavaScriptExpression | 'default';
			}
		}
	}

	/**
	 * While
	 *
	 * @see https://github.com/pugjs/pug-ast-spec/blob/master/parser.md#while
	 */
	export interface While extends _Node {
		type: 'While';
		test: AbstractNodeTypes.JavaScriptExpression;
	}

	/**
	 * Each
	 *
	 * @see https://github.com/pugjs/pug-ast-spec/blob/master/parser.md#each
	 */
	export interface Each extends AbstractNodeTypes.BlockNode {
		type: 'Each';
		obj: AbstractNodeTypes.JavaScriptExpression; // the object or array that is being looped
		val: AbstractNodeTypes.JavaScriptIdentifier; // the variable name of the value of a specific object property or array member
		key: AbstractNodeTypes.JavaScriptIdentifier | null; // the variable name, if any, of the object property name or array index of `val`
		alternate: Block | null; // the else expression
	}

	/**
	 * Mixin
	 *
	 * @see https://github.com/pugjs/pug-ast-spec/blob/master/parser.md#mixin
	 */
	export interface Mixin extends AbstractNodeTypes.AttributedNode, AbstractNodeTypes.BlockNode {
		type: 'Mixin';
		name: AbstractNodeTypes.JavaScriptIdentifier; // the name of the mixin
		call: boolean; // if this node is a mixin call (as opposed to mixin definition)
		args: string; // list of arguments (declared in case of mixin definition, or specified in case of mixin call)
	}

	/**
	 * MixinBlock
	 *
	 * @see
	 */
	export interface MixinBlock extends AbstractNodeTypes.PlaceholderNode {
		type: 'MixinBlock';
	}

	/**
	 * Yield
	 *
	 * @see https://github.com/pugjs/pug-ast-spec/blob/master/parser.md#yield
	 */
	export interface YieldBlock extends AbstractNodeTypes.PlaceholderNode {
		type: 'YieldBlock';
	}
	/**
	 * File Operations
	 *
	 * @see https://github.com/pugjs/pug-ast-spec/blob/master/parser.md#file-operations
	 */
	// eslint-disable-next-line @typescript-eslint/no-namespace
	export namespace FileOperations {
		/**
		 * FileReference
		 *
		 * @see https://github.com/pugjs/pug-ast-spec/blob/master/parser.md#filereference
		 */
		export interface FileReference extends _Node {
			type: 'FileReference';
			path: string;
		}

		interface FileNode extends _Node {
			file: FileReference;
		}

		/**
		 * Pug Include
		 *
		 * @see https://github.com/pugjs/pug-ast-spec/blob/master/parser.md#pug-include
		 */
		export interface Include extends AbstractNodeTypes.BlockNode, FileNode {
			type: 'Include';
		}

		/**
		 * Raw Include
		 *
		 * @see https://github.com/pugjs/pug-ast-spec/blob/master/parser.md#raw-include
		 */
		export interface RawInclude extends FileNode {
			type: 'RawInclude';
			filters: IncludeFilter[];
		}

		export interface IncludeFilter extends FilterNode {
			type: 'IncludeFilter';
		}

		/**
		 * Extends/NamedBlock
		 *
		 * @see https://github.com/pugjs/pug-ast-spec/blob/master/parser.md#extendsnamedblock
		 */
		export interface Extends extends FileNode {
			type: 'Extends';
		}

		export interface NamedBlock extends AbstractNodeTypes.PlaceholderNode {
			type: 'NamedBlock';
			name: string;
			mode: 'replace' | 'append' | 'prepend';
			nodes: Node[]; // no elements if the NamedBlock is a placeholder
		}
	}

	interface FilterNode extends _Node {
		name: string;
		attrs: AbstractNodeTypes.Attribute[]; // filter options
	}

	/**
	 * Filters
	 *
	 * @see	https://github.com/pugjs/pug-ast-spec/blob/master/parser.md#filter
	 */
	export interface Filter extends FilterNode, AbstractNodeTypes.BlockNode {
		type: 'Filter';
	}

	export type Node =
		| Block
		| Doctype
		| Comments.Comment
		| Comments.BlockComment
		| Text
		| Tag
		| InterpolatedTag
		| Code
		| CodeHelpers.Conditional
		| CodeHelpers.CaseWhen.Case
		| CodeHelpers.CaseWhen.When
		| While
		| Each
		| Mixin
		| MixinBlock
		| YieldBlock
		| FileOperations.FileReference
		| FileOperations.Include
		| FileOperations.RawInclude
		| FileOperations.IncludeFilter
		| FileOperations.Extends
		| FileOperations.NamedBlock
		| Filter;
}
