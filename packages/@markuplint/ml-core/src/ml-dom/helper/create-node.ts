import { MLASTAbstructNode, MLASTNode, MLASTNodeType } from '@markuplint/ml-ast';
import {
	MLDOMComment,
	MLDOMDoctype,
	MLDOMElement,
	MLDOMElementCloseTag,
	MLDOMInvalidNode,
	MLDOMOmittedElement,
	MLDOMText,
} from '../tokens';
import { Document } from '../';
import { MappedNode } from './mapped-nodes';
import { RuleConfigValue } from '@markuplint/ml-config';

export function createNode<N extends MLASTAbstructNode, T extends RuleConfigValue, O = null>(
	astNode: N,
	document: Document<T, O>,
	pearNode?: MLDOMElement<T, O>,
): MappedNode<N, T, O> {
	const _astNode = astNode as MLASTNode;
	switch (_astNode.type) {
		case MLASTNodeType.Doctype: {
			return new MLDOMDoctype<T, O>(_astNode, document) as MappedNode<N, T, O>;
		}
		case MLASTNodeType.StartTag: {
			return new MLDOMElement<T, O>(_astNode, document) as MappedNode<N, T, O>;
		}
		case MLASTNodeType.EndTag: {
			return new MLDOMElementCloseTag<T, O>(_astNode, document, pearNode!) as MappedNode<N, T, O>;
		}
		case MLASTNodeType.Comment: {
			return new MLDOMComment<T, O>(_astNode, document) as MappedNode<N, T, O>;
		}
		case MLASTNodeType.Text: {
			return new MLDOMText<T, O>(_astNode, document) as MappedNode<N, T, O>;
		}
		case MLASTNodeType.InvalidNode: {
			return new MLDOMInvalidNode<T, O>(_astNode, document) as MappedNode<N, T, O>;
		}
		case MLASTNodeType.OmittedTag: {
			return new MLDOMOmittedElement<T, O>(_astNode, document) as MappedNode<N, T, O>;
		}
	}
	throw new TypeError(`Invalid AST node typs "${astNode.type}"`);
}
