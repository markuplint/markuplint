import { MLASTAbstructNode, MLASTElementCloseTag, MLASTNode, MLASTNodeType } from '@markuplint/ml-ast';
import { RuleConfigValue } from '@markuplint/ml-config';
import { Document } from '../';
import { Comment, Doctype, Element, InvalidNode, OmittedElement, Text } from '../tokens';
import { getNode } from './dom-traverser';
import { MappedNode } from './mapped-nodes';

export function createNode<N extends MLASTAbstructNode, T extends RuleConfigValue, O = null>(
	astNode: N,
	document: Document<T, O>,
): MappedNode<N, T, O> {
	const _astNode = astNode as MLASTNode;
	switch (_astNode.type) {
		case MLASTNodeType.Doctype: {
			return new Doctype<T, O>(_astNode, document) as MappedNode<N, T, O>;
		}
		case MLASTNodeType.StartTag: {
			return new Element<T, O>(_astNode, document) as MappedNode<N, T, O>;
		}
		case MLASTNodeType.EndTag: {
			return getNode<MLASTElementCloseTag, T, O>(_astNode) as MappedNode<N, T, O>;
		}
		case MLASTNodeType.Comment: {
			return new Comment<T, O>(_astNode, document) as MappedNode<N, T, O>;
		}
		case MLASTNodeType.Text: {
			return new Text<T, O>(_astNode, document) as MappedNode<N, T, O>;
		}
		case MLASTNodeType.InvalidNode: {
			return new InvalidNode<T, O>(_astNode, document) as MappedNode<N, T, O>;
		}
		case MLASTNodeType.OmittedTag: {
			return new OmittedElement<T, O>(_astNode, document) as MappedNode<N, T, O>;
		}
	}
	throw new TypeError(`Invalid AST node typs "${astNode.type}"`);
}
