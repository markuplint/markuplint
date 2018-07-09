export enum MLASTNodeType {
	Doctype,
	StartTag,
	EndTag,
	Comment,
}

export interface MLASTNode {
	raw: string;
	startLine: number;
	endLine: number;
	startCol: number;
	endCol: number;
	type: MLASTNodeType;
	namespace: string;
	children: MLASTNode[];
	parent: MLASTNode | null;
	isFragment: boolean;
	isGhost: boolean;
}
