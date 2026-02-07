import type { MLDocument } from './document.js';
import type { MLElement } from './element.js';
import type { DocumentTypeNodeType } from './types.js';
import type { MLASTDoctype } from '@markuplint/ml-ast';
import type { PlainData, RuleConfigValue } from '@markuplint/ml-config';

import { after, before, remove, replaceWith } from '../manipulations/child-node-methods.js';

import { MLNode } from './node.js';

/**
 * Represents a DOM DocumentType node wrapper in the markuplint DOM tree.
 * Wraps the `<!DOCTYPE ...>` declaration and implements the standard DOM `DocumentType` interface.
 *
 * @template T - The rule configuration value type
 * @template O - The rule options type
 */
export class MLDocumentType<T extends RuleConfigValue, O extends PlainData = undefined>
	extends MLNode<T, O, MLASTDoctype>
	implements DocumentType
{
	/**
	 * The name of the document type (e.g., `"html"`).
	 */
	readonly name: string;

	/**
	 * The public identifier of the document type, or an empty string if not specified.
	 */
	readonly publicId: string;

	/**
	 * The system identifier of the document type, or an empty string if not specified.
	 */
	readonly systemId: string;

	/**
	 * Creates a new MLDocumentType instance.
	 *
	 * @param astNode - The AST doctype node to wrap
	 * @param document - The owning document
	 */
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
	 * @implements DOM API: `DocumentType`
	 * @see https://dom.spec.whatwg.org/#dom-node-textcontent
	 */
	get textContent(): null {
		return null;
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
