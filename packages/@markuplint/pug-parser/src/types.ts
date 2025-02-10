export type ASTBlock = PugAST<ASTNode>;

export type ASTNode =
	| ASTTagNode
	| ASTTextNode
	| ASTCodeNode
	| ASTComment
	| ASTBlockComment
	| ASTDoctype
	| ASTIncludeNode
	| ASTRawIncludeNode
	| ASTMixinNode
	| ASTMixinSlotNode
	| ASTNamedBlockNode
	| ASTFilterNode
	| ASTEachNode
	| ASTConditionalNode
	| ASTCaseNode
	| ASTCaseWhenNode;

export type ASTTagNode = Omit<PugASTTagNode<ASTAttr, ASTBlock>, 'selfClosing' | 'isInline'> & AdditionalASTData;

export type ASTTextNode = Omit<PugASTTextNode, 'val'> & AdditionalASTData;

export type ASTCodeNode = PugASTCodeNode & AdditionalASTData;

export type ASTComment = PugASTCommentNode & AdditionalASTData;

export type ASTBlockComment = PugASTBlockCommentNode<ASTBlock> & AdditionalASTData;

export type ASTDoctype = PugASTDoctypeNode & AdditionalASTData;

export type ASTIncludeNode = PugASTIncludeNode<ASTBlock> & AdditionalASTData;

export type ASTRawIncludeNode = PugASTRawIncludeNode & AdditionalASTData;

export type ASTMixinNode = Omit<PugASTMixinNode<ASTAttr, ASTBlock>, 'attributeBlocks'> & AdditionalASTData;

export type ASTMixinSlotNode = PugASTMixinSlotNode & AdditionalASTData;

export type ASTNamedBlockNode = PugASTNamedBlockNode<ASTNode> & AdditionalASTData;

export type ASTFilterNode = PugASTFilterNode<ASTAttr, ASTBlock> & AdditionalASTData;

export type ASTEachNode = PugASTEachNode<ASTBlock> & AdditionalASTData;

export type ASTConditionalNode = Omit<PugASTConditionalNode<ASTBlock>, 'consequent' | 'alternate'> & {
	block: ASTBlock;
} & AdditionalASTData;

export type ASTCaseNode = PugASTCaseNode<ASTBlock> & AdditionalASTData;

export type ASTCaseWhenNode = PugASTCaseWhenNode<ASTBlock> & AdditionalASTData;

export type ASTAttr = PugASTAttr & AdditionalASTData;

type AdditionalASTData = {
	raw: string;
	offset: number;
	endOffset: number;
	endLine: number;
	endColumn: number;
};

export interface PugAST<N> {
	type: 'Block';
	nodes: N[];
	line: number;
}

export type PugASTNode =
	| PugASTTagNode<PugASTAttr, PugAST<PugASTNode>>
	| PugASTTextNode
	| PugASTCodeNode
	| PugASTCommentNode
	| PugASTBlockCommentNode<PugAST<PugASTNode>>
	| PugASTDoctypeNode
	| PugASTIncludeNode<PugAST<PugASTNode>>
	| PugASTRawIncludeNode
	| PugASTMixinNode<PugASTAttr, PugAST<PugASTNode>>
	| PugASTMixinSlotNode
	| PugASTNamedBlockNode<PugASTNode>
	| PugASTFilterNode<PugASTAttr, PugAST<PugASTTextNode>>
	| PugASTEachNode<PugAST<PugASTNode>>
	| PugASTConditionalNode<PugAST<PugASTNode>>
	| PugASTCaseNode<PugAST<PugASTNode>>
	| PugASTCaseWhenNode<PugAST<PugASTNode>>;

type PugASTTagNode<A, B> = {
	type: 'Tag';
	name: string;
	selfClosing: boolean;
	attrs: A[];
	attributeBlocks: {
		type: 'AttributeBlock';
		val: string;
		line: number;
		column: number;
	}[];
	isInline: boolean;
	line: number;
	column: number;
	block: B;
};

export type PugASTTextNode = {
	type: 'Text';
	val: string;
	isHtml?: true;
	line: number;
	column: number;
};

type PugASTCodeNode = {
	type: 'Code';
	val: string;
	buffer: boolean;
	mustEscape: boolean;
	isInline: boolean;
	line: number;
	column: number;
};

type PugASTCommentNode = {
	type: 'Comment';
	val: string;
	buffer: boolean;
	line: number;
	column: number;
};

type PugASTBlockCommentNode<B> = {
	type: 'BlockComment';
	val: string;
	block: B;
	buffer: boolean;
	line: number;
	column: number;
};

type PugASTDoctypeNode = {
	type: 'Doctype';
	val: string;
	line: number;
	column: number;
};

type PugASTIncludeNode<B> = {
	type: 'Include';
	file: RugASTIncludeFile;
	block: B;
	line: number;
	column: number;
};

type PugASTRawIncludeNode = {
	type: 'RawInclude';
	file: RugASTIncludeFile;
	line: number;
	column: number;
	filters: unknown[];
};

type RugASTIncludeFile = {
	type: 'FileReference';
	path: string;
	line: number;
	column: number;
};

type PugASTEachNode<B> = {
	type: 'Each';
	obj: string;
	val: string;
	key: string | null;
	block: B;
	line: number;
	column: number;
};

type PugASTMixinNode<A, B> = {
	type: 'Mixin';
	name: string;
	args: string;
	call: boolean;
	block: B | null;
	attrs?: A[];
	attributeBlocks: never[];
	line: number;
	column: number;
};

type PugASTMixinSlotNode = {
	type: 'MixinBlock';
	line: number;
	column: number;
};

interface PugASTNamedBlockNode<N> {
	type: 'NamedBlock';
	name: string;
	mode: 'replace' | 'append' | 'prepend';
	nodes: N[];
	line: number;
	column: number;
}

type PugASTFilterNode<A, B> = {
	type: 'Filter';
	name: string;
	block: B;
	attrs: A[];
	line: number;
	column: number;
};

export type PugASTConditionalNode<B> = {
	type: 'Conditional';
	test: string;
	consequent: B;
	alternate?: B | PugASTConditionalNode<B>;
	line: number;
	column: number;
};

type PugASTCaseNode<B> = {
	type: 'Case';
	expr: string;
	block: B;
	line: number;
	column: number;
};

type PugASTCaseWhenNode<B> = {
	type: 'When';
	expr: string;
	block: B;
	line: number;
	column: number;
};

export type PugASTAttr = {
	name: string;
	val: string | true;
	mustEscape: boolean;
	line: number;
	column: number;
};
