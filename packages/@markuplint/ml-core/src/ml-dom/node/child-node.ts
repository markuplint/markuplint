import type { MLBlock } from './block.js';
import type { MLCharacterData } from './character-data.js';
import type { MLDocumentType } from './document-type.js';
import type { MLElement } from './element.js';
import type { MLNode } from './node.js';
import type { PlainData, RuleConfigValue } from '@markuplint/ml-config';

/**
 * > Element includes NonDocumentTypeChildNode;
 * > CharacterData includes NonDocumentTypeChildNode;
 *
 * > DocumentType includes ChildNode;
 * > Element includes ChildNode;
 * > CharacterData includes ChildNode;
 *
 * @see https://dom.spec.whatwg.org/#idl-index
 */
export type MLChildNode<T extends RuleConfigValue, O extends PlainData = undefined> =
	| MLDocumentType<T, O>
	| MLCharacterData<T, O>
	| MLElement<T, O>
	| MLBlock<T, O>;

export function isChildNode<T extends RuleConfigValue, O extends PlainData = undefined>(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	node: MLNode<T, O>,
): node is MLChildNode<T, O> {
	return (
		node.is(node.DOCUMENT_TYPE_NODE) ||
		node.is(node.CDATA_SECTION_NODE) ||
		node.is(node.COMMENT_NODE) ||
		node.is(node.TEXT_NODE) ||
		node.is(node.ELEMENT_NODE) ||
		node.is(node.MARKUPLINT_PREPROCESSOR_BLOCK)
	);
}
