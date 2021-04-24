import {
	MLDOMComment,
	MLDOMDoctype,
	MLDOMElement,
	MLDOMElementCloseTag,
	MLDOMOmittedElement,
	MLDOMPreprocessorSpecificBlock,
	MLDOMText,
} from './tokens';
import { RuleConfigValue } from '@markuplint/ml-config';

export interface IMLDOMDoctype extends IMLDOMNode {
	type: 'Doctype';
}

export interface IMLDOMElement extends IMLDOMNode {
	type: 'Element';
}
export interface IMLDOMElementCloseTag extends IMLDOMNode {
	type: 'ElementCloseTag';
}
export interface IMLDOMOmittedElement extends IMLDOMNode {
	type: 'OmittedElement';
}
export interface IMLDOMComment extends IMLDOMNode {
	type: 'Comment';
}
export interface IMLDOMText extends IMLDOMNode {
	type: 'Text';
}
export interface IMLDOMPreprocessorSpecificBlock extends IMLDOMNode {
	type: 'PSBlock';
}

export interface IMLDOMNode {}

export type AnonymousNode<T extends RuleConfigValue, O = null> =
	| MLDOMDoctype<T, O>
	| MLDOMElement<T, O>
	| MLDOMElementCloseTag<T, O>
	| MLDOMOmittedElement<T, O>
	| MLDOMComment<T, O>
	| MLDOMPreprocessorSpecificBlock<T, O>
	| MLDOMText<T, O>;

export type NodeType =
	| 'Doctype'
	| 'Element'
	| 'ElementCloseTag'
	| 'OmittedElement'
	| 'Comment'
	| 'Text'
	| 'Node'
	| 'PSBlock';

export type Walker<T extends RuleConfigValue, O = null, N = AnonymousNode<T, O>> = (node: N) => Promise<void> | void;

export type SyncWalker<T extends RuleConfigValue, O = null, N = AnonymousNode<T, O>> = (node: N) => void;
