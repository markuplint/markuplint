import { MLASTAbstructNode, MLASTElementCloseTag, MLASTNode, MLASTNodeType } from '@markuplint/ml-ast/src';
// import Attribute from '../tokens/attribute';
import Comment from '../tokens/comment';
import Doctype from '../tokens/doctype';
import Element from '../tokens/element';
import InvalidNode from '../tokens/invalid-node';
import OmittedElement from '../tokens/omitted-element';
import Text from '../tokens/text';
import { getNode } from './dom-traverser';
import { MappedNode } from './mapped-nodes';

export default function createNode<N extends MLASTAbstructNode, T, O>(astNode: N): MappedNode<N, T, O> {
	const _astNode = astNode as MLASTNode;
	switch (_astNode.type) {
		case MLASTNodeType.Doctype: {
			return new Doctype<T, O>(_astNode) as MappedNode<N, T, O>;
		}
		case MLASTNodeType.StartTag: {
			return new Element<T, O>(_astNode) as MappedNode<N, T, O>;
		}
		case MLASTNodeType.EndTag: {
			return getNode<MLASTElementCloseTag, T, O>(_astNode) as MappedNode<N, T, O>;
		}
		case MLASTNodeType.Comment: {
			return new Comment<T, O>(_astNode) as MappedNode<N, T, O>;
			break;
		}
		case MLASTNodeType.Text: {
			return new Text<T, O>(_astNode) as MappedNode<N, T, O>;
			break;
		}
		case MLASTNodeType.InvalidNode: {
			return new InvalidNode<T, O>(_astNode) as MappedNode<N, T, O>;
			break;
		}
		case MLASTNodeType.OmittedTag: {
			return new OmittedElement<T, O>(_astNode) as MappedNode<N, T, O>;
			break;
		}
	}
}
