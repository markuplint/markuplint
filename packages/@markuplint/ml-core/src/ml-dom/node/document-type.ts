import type { MLDocument } from './document.js';
import type { MLElement } from './element.js';
import type { DocumentTypeNodeType } from './types.js';
import type { MLASTDoctype } from '@markuplint/ml-ast';
import type { PlainData, RuleConfigValue } from '@markuplint/ml-config';

import { after, before, remove, replaceWith } from '../manipulations/child-node-methods.js';

import { MLNode } from './node.js';

export class MLDocumentType<T extends RuleConfigValue, O extends PlainData = undefined>
	extends MLNode<T, O, MLASTDoctype>
	implements DocumentType
{
	readonly name: string;
	readonly publicId: string;
	readonly systemId: string;

	constructor(
		astNode: MLASTDoctype,
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		document: MLDocument<T, O>,
	) {
		super(astNode, document);
		this.name = astNode.name;
		this.publicId = astNode.publicId;
		this.systemId = astNode.systemId;
	}

	/**
	 * Returns a string appropriate for the type of node as `DocumentType`
	 *
	 * @see https://dom.spec.whatwg.org/#ref-for-documenttype%E2%91%A0%E2%93%AA
	 */
	get nodeName(): string {
		return this.name;
	}

	/**
	 * Returns a number appropriate for the type of `DocumentType`
	 */
	get nodeType(): DocumentTypeNodeType {
		return this.DOCUMENT_TYPE_NODE;
	}

	/**
	 * @implements DOM API: `CharacterData`
	 */
	after(
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		...nodes: (string | MLElement<any, any>)[]
	): void {
		after(this, ...nodes);
	}

	/**
	 * @implements DOM API: `CharacterData`
	 */
	before(
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		...nodes: (string | MLElement<any, any>)[]
	): void {
		before(this, ...nodes);
	}

	/**
	 * @implements DOM API: `CharacterData`
	 */
	remove(): void {
		remove(this);
	}

	/**
	 * @implements DOM API: `CharacterData`
	 */
	replaceWith(
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		...nodes: (string | MLElement<any, any>)[]
	): void {
		replaceWith(this, ...nodes);
	}
}
