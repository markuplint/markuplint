import type { MLDocument } from './document.js';
import type { MLElement } from './element.js';
import type { MLASTNode } from '@markuplint/ml-ast';
import type { PlainData, RuleConfigValue } from '@markuplint/ml-config';

import { getShadowHost } from '../helper/tree-scope.js';

import { MLDocumentFragment } from './document-fragment.js';
import { UnexpectedCallError } from '@markuplint/shared';

/**
 * A declarative shadow root: the content of a `template` element with a `shadowrootmode` attribute
 * that the HTML parser attaches to the parent of the `template` element as a shadow root. As the
 * parser sets the template contents of such a `template` element to the shadow root, a
 * shadow root is the `content` of its `template` element, and it is a tree of its own.
 *
 * @template T - The rule configuration value type
 * @template O - The rule options type
 * @see https://html.spec.whatwg.org/multipage/parsing.html#parsing-main-inhead
 */
export class MLShadowRoot<T extends RuleConfigValue, O extends PlainData = undefined>
	extends MLDocumentFragment<T, O>
	implements ShadowRoot
{
	readonly #template: MLElement<T, O>;

	/**
	 * @param astNode - A copy of the AST node of the `template` element that has a uuid of its own
	 * @param document - The owning document
	 * @param template - The `template` element whose content it is
	 */
	constructor(
		astNode: MLASTNode,
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		document: MLDocument<T, O>,
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		template: MLElement<T, O>,
	) {
		super(astNode, document);
		this.#template = template;
	}

	/**
	 * The element that the shadow root is attached to.
	 *
	 * @see https://dom.spec.whatwg.org/#dom-shadowroot-host
	 */
	get host(): MLElement<T, O> {
		const host = getShadowHost(this.#template);
		if (!host) {
			throw new TypeError('A shadow root is attached to an element');
		}
		return host;
	}

	/**
	 * The `shadowrootmode` attribute of the `template` element.
	 *
	 * @see https://dom.spec.whatwg.org/#dom-shadowroot-mode
	 */
	get mode(): 'open' | 'closed' {
		return this.#template.declarativeShadowRootMode ?? 'open';
	}

	/**
	 * Whether the `template` element has the `shadowrootdelegatesfocus` attribute.
	 *
	 * @see https://dom.spec.whatwg.org/#dom-shadowroot-delegatesfocus
	 */
	get delegatesFocus(): boolean {
		return this.#template.hasAttribute('shadowrootdelegatesfocus');
	}

	/**
	 * Whether the `template` element has the `shadowrootclonable` attribute.
	 *
	 * @see https://dom.spec.whatwg.org/#dom-shadowroot-clonable
	 */
	get clonable(): boolean {
		return this.#template.hasAttribute('shadowrootclonable');
	}

	/**
	 * Whether the `template` element has the `shadowrootserializable` attribute.
	 *
	 * @see https://dom.spec.whatwg.org/#dom-shadowroot-serializable
	 */
	get serializable(): boolean {
		return this.#template.hasAttribute('shadowrootserializable');
	}

	/**
	 * `manual` when the `shadowrootslotassignment` attribute of the `template` element says so,
	 * `named` otherwise.
	 *
	 * @see https://dom.spec.whatwg.org/#dom-shadowroot-slotassignment
	 */
	get slotAssignment(): 'named' | 'manual' {
		return this.#template.getAttribute('shadowrootslotassignment')?.toLowerCase() === 'manual' ? 'manual' : 'named';
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `ShadowRoot`
	 */
	get innerHTML(): string {
		throw new UnexpectedCallError('Not supported "innerHTML" property');
	}

	set innerHTML(html: string) {
		throw new UnexpectedCallError('Not supported "innerHTML" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `ShadowRoot`
	 */
	get onslotchange(): ((this: ShadowRoot, ev: Event) => any) | null {
		throw new UnexpectedCallError('Not supported "onslotchange" property');
	}

	set onslotchange(handler: ((this: ShadowRoot, ev: Event) => any) | null) {
		throw new UnexpectedCallError('Not supported "onslotchange" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `ShadowRoot`
	 */
	getHTML(
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		options?: GetHTMLOptions,
	): string {
		throw new UnexpectedCallError('Not supported "getHTML" method');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `ShadowRoot`
	 */
	setHTMLUnsafe(html: string): void {
		throw new UnexpectedCallError('Not supported "setHTMLUnsafe" method');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `DocumentOrShadowRoot`
	 */
	get activeElement(): Element | null {
		throw new UnexpectedCallError('Not supported "activeElement" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `DocumentOrShadowRoot`
	 */
	get adoptedStyleSheets(): CSSStyleSheet[] {
		throw new UnexpectedCallError('Not supported "adoptedStyleSheets" property');
	}

	set adoptedStyleSheets(sheets: CSSStyleSheet[]) {
		throw new UnexpectedCallError('Not supported "adoptedStyleSheets" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `DocumentOrShadowRoot`
	 */
	get customElementRegistry(): CustomElementRegistry | null {
		throw new UnexpectedCallError('Not supported "customElementRegistry" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `DocumentOrShadowRoot`
	 */
	get fullscreenElement(): Element | null {
		throw new UnexpectedCallError('Not supported "fullscreenElement" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `DocumentOrShadowRoot`
	 */
	get pictureInPictureElement(): Element | null {
		throw new UnexpectedCallError('Not supported "pictureInPictureElement" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `DocumentOrShadowRoot`
	 */
	get pointerLockElement(): Element | null {
		throw new UnexpectedCallError('Not supported "pointerLockElement" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `DocumentOrShadowRoot`
	 */
	get styleSheets(): StyleSheetList {
		throw new UnexpectedCallError('Not supported "styleSheets" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `DocumentOrShadowRoot`
	 */
	elementFromPoint(x: number, y: number): Element | null {
		throw new UnexpectedCallError('Not supported "elementFromPoint" method');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `DocumentOrShadowRoot`
	 */
	elementsFromPoint(x: number, y: number): Element[] {
		throw new UnexpectedCallError('Not supported "elementsFromPoint" method');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `DocumentOrShadowRoot`
	 */
	getAnimations(): Animation[] {
		throw new UnexpectedCallError('Not supported "getAnimations" method');
	}
}
