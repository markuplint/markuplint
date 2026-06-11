/* global StylePropertyMap, StylePropertyMapReadOnly */

import type { MLDocument } from './document.js';
import type { MLNamedNodeMap } from './named-node-map.js';
import type { MLNode } from './node.js';
import type { MLText } from './text.js';
import type { ElementNodeType, PretenderContext, PretenderContextPretender } from './types.js';
import type {
	ElementType,
	MLASTAttr,
	MLASTBlockBehavior,
	MLASTElement,
	MLASTElementCloseTag,
	NamespaceURI,
} from '@markuplint/ml-ast';
import type {
	PlainData,
	Pretender,
	PretenderARIA,
	RegexSelector,
	RuleConfigValue,
	RuleInfo,
} from '@markuplint/ml-config';
import type { ARIAVersion } from '@markuplint/ml-spec';

import { getSpecByTagName, resolveNamespace } from '@markuplint/ml-spec';
import type { SelectorMatches } from '@markuplint/selector';
import { matchSelector } from '@markuplint/selector';

import { getAccname } from '../helper/accname.js';
import {
	after,
	before,
	nextElementSibling,
	previousElementSibling,
	remove,
	replaceWith,
} from '../manipulations/child-node-methods.js';
import { MLAttr } from './attr.js';
import { MLDomTokenList } from './dom-token-list.js';
import { MLElementCloseTag } from './element-close-tag.js';
import { toNamedNodeMap } from './named-node-map.js';
import { toHTMLCollection, toNodeList } from './node-list.js';
import { MLParentNode } from './parent-node.js';
import { UnexpectedCallError } from '@markuplint/shared';

const HTML_NAMESPACE = 'http://www.w3.org/1999/xhtml';

/**
 * Represents a DOM Element node wrapper in the markuplint DOM tree.
 * Provides access to element attributes, tag names, namespace, ARIA properties,
 * accessibility information, pretender context, and CSS selector matching.
 * This is the primary class used for linting HTML elements.
 *
 * @template T - The rule configuration value type
 * @template O - The rule options type
 */
export class MLElement<T extends RuleConfigValue, O extends PlainData = undefined>
	extends MLParentNode<T, O, MLASTElement>
	implements Element, HTMLOrSVGElement, HTMLElement
{
	#attributes: MLAttr<T, O>[];

	/**
	 * The closing tag for this element, or null if the element is self-closing or void.
	 */
	readonly closeTag: MLElementCloseTag<T, O> | null;

	/**
	 * Element type
	 *
	 * - `html`: From native HTML Standard
	 * - `web-component`: As the Web Component according to HTML Standard
	 * - `authored`:  Authored element (JSX Element etc.) through the view framework or the template engine.
	 */
	readonly elementType: ElementType;
	#getChildElementsAndTextNodeWithoutWhitespacesCache: (MLElement<T, O> | MLText<T, O>)[] | null = null;
	/**
	 * Whether this element belongs to a non-HTML namespace (e.g., SVG or MathML).
	 */
	readonly isForeignElement: boolean;

	/**
	 * Whether this element was implicitly created (e.g., an omitted `<body>` tag in HTML).
	 */
	readonly isOmitted: boolean;
	#localName: string;

	/**
	 * The namespace URI of this element (e.g., `http://www.w3.org/1999/xhtml` for HTML elements).
	 */
	readonly namespaceURI: NamespaceURI;

	/**
	 * ## Why this cache exists
	 *
	 * Multiple rules and the `:aria(has name)` selector evaluate the accessible name
	 * of every element during a single lint pass. Without caching, the same
	 * expensive tree-walking algorithm (AccName Computation 1.2) runs repeatedly
	 * for the same element — once per consumer. Benchmarks on a 500-element page
	 * show **14,626 total calls** of which **11,573 (79%) are cache hits**,
	 * eliminating redundant computation.
	 *
	 * ## Why memoization is safe
	 *
	 * The MLDOM is **immutable** once constructed — no attributes or child nodes
	 * change during a lint pass. Therefore the accessible name for a given ARIA
	 * version is deterministic and will never become stale. No invalidation
	 * logic is needed. The cache is garbage-collected together with the
	 * MLElement instance when the document is released.
	 *
	 * Introduced to resolve {@link https://github.com/markuplint/markuplint/issues/2179 | #2179}
	 * (AccName performance bottleneck).
	 *
	 * @see {@link getAccessibleName} — the public method that reads/writes this cache
	 */
	#accessibleNameCache: Map<ARIAVersion, string> = new Map();
	#normalizedAttrs: Map<MLAttr<T, O>[], MLNamedNodeMap<T, O>> = new Map();
	#normalizedString: string | null = null;

	readonly ontouchcancel?:
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: TouchEvent,
		  ) => any)
		| null
		| undefined;

	readonly ontouchend?:
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: TouchEvent,
		  ) => any)
		| null
		| undefined;

	readonly ontouchmove?:
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: TouchEvent,
		  ) => any)
		| null
		| undefined;

	readonly ontouchstart?:
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: TouchEvent,
		  ) => any)
		| null
		| undefined;

	/**
	 * The pretender context if this element is participating in pretender behavior,
	 * or null if it is not a pretender or pretended element.
	 *
	 * The virtual element created by `pretending()` is not registered in the
	 * document's `nodeList`; walkers visit only the original element, which
	 * delegates its name and attribute getters to the virtual element.
	 */
	pretenderContext: PretenderContext<MLElement<T, O>, T, O> | null = null;

	/**
	 * Block behavior associated with this element, if any.
	 */
	readonly blockBehavior: MLASTBlockBehavior | null;

	/**
	 * The tag close character string (e.g., `>` or `/>` or `%>`).
	 */
	readonly tagCloseChar: string;

	/**
	 * The tag open character string (e.g., `<` or `<%`).
	 */
	readonly tagOpenChar: string;

	/**
	 * Creates a new MLElement instance from an AST element node.
	 *
	 * @param astNode - The AST element node to wrap
	 * @param document - The owning document
	 */
	constructor(
		astNode: MLASTElement,
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		document: MLDocument<T, O>,
	) {
		super(astNode, document, astNode.isFragment);
		this.#attributes = astNode.attributes.map(attr => new MLAttr(attr, this));
		const pairAstNode = astNode.pairNodeUuid
			? (document.getAstNodeByUuid(astNode.pairNodeUuid) as MLASTElementCloseTag | undefined)
			: null;
		this.closeTag = pairAstNode ? new MLElementCloseTag(pairAstNode, document, this) : null;
		const ns = resolveNamespace(astNode.nodeName, astNode.namespace);
		this.namespaceURI = astNode.namespace;
		this.elementType = astNode.elementType;
		this.#localName = ns.localName;
		this.isForeignElement = this.namespaceURI !== HTML_NAMESPACE;

		this.isOmitted = astNode.isGhost;

		this.tagOpenChar = astNode.tagOpenChar;
		this.tagCloseChar = astNode.tagCloseChar;

		this.blockBehavior = astNode.blockBehavior;
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get accessKey(): string {
		throw new UnexpectedCallError('Not supported "accessKey" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get accessKeyLabel(): string {
		throw new UnexpectedCallError('Not supported "accessKeyLabel" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ariaActiveDescendantElement(): MLElement<T, O> | null {
		throw new UnexpectedCallError('Not supported "ariaActiveDescendantElement" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ariaAtomic(): string | null {
		throw new UnexpectedCallError('Not supported "ariaAtomic" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ariaAutoComplete(): string | null {
		throw new UnexpectedCallError('Not supported "ariaAutoComplete" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ariaBrailleLabel(): string | null {
		throw new UnexpectedCallError('Not supported "ariaBrailleLabel" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ariaBrailleRoleDescription(): string | null {
		throw new UnexpectedCallError('Not supported "ariaBrailleRoleDescription" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ariaBusy(): string | null {
		throw new UnexpectedCallError('Not supported "ariaBusy" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ariaChecked(): string | null {
		throw new UnexpectedCallError('Not supported "ariaChecked" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ariaColCount(): string | null {
		throw new UnexpectedCallError('Not supported "ariaColCount" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ariaColIndex(): string | null {
		throw new UnexpectedCallError('Not supported "ariaColIndex" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ariaColIndexText(): string | null {
		throw new UnexpectedCallError('Not supported "ariaColIndexText" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ariaColSpan(): string | null {
		throw new UnexpectedCallError('Not supported "ariaColSpan" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ariaControlsElements(): readonly MLElement<T, O>[] | null {
		throw new UnexpectedCallError('Not supported "ariaControlsElements" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ariaCurrent(): string | null {
		throw new UnexpectedCallError('Not supported "ariaCurrent" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ariaDescribedByElements(): readonly MLElement<T, O>[] | null {
		throw new UnexpectedCallError('Not supported "ariaDescribedByElements" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ariaDescription(): string | null {
		throw new UnexpectedCallError('Not supported "ariaDescription" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ariaDetailsElements(): readonly MLElement<T, O>[] | null {
		throw new UnexpectedCallError('Not supported "ariaDetailsElements" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ariaDisabled(): string | null {
		throw new UnexpectedCallError('Not supported "ariaDisabled" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ariaErrorMessageElements(): readonly MLElement<T, O>[] | null {
		throw new UnexpectedCallError('Not supported "ariaErrorMessageElements" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ariaExpanded(): string | null {
		throw new UnexpectedCallError('Not supported "ariaExpanded" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ariaFlowToElements(): readonly MLElement<T, O>[] | null {
		throw new UnexpectedCallError('Not supported "ariaFlowToElements" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ariaHasPopup(): string | null {
		throw new UnexpectedCallError('Not supported "ariaHasPopup" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ariaHidden(): string | null {
		throw new UnexpectedCallError('Not supported "ariaHidden" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ariaInvalid(): string | null {
		throw new UnexpectedCallError('Not supported "ariaInvalid" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ariaKeyShortcuts(): string | null {
		throw new UnexpectedCallError('Not supported "ariaKeyShortcuts" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ariaLabel(): string | null {
		throw new UnexpectedCallError('Not supported "ariaLabel" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ariaLabelledByElements(): readonly MLElement<T, O>[] | null {
		throw new UnexpectedCallError('Not supported "ariaLabelledByElements" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ariaLevel(): string | null {
		throw new UnexpectedCallError('Not supported "ariaLevel" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ariaLive(): string | null {
		throw new UnexpectedCallError('Not supported "ariaLive" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ariaModal(): string | null {
		throw new UnexpectedCallError('Not supported "ariaModal" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ariaMultiLine(): string | null {
		throw new UnexpectedCallError('Not supported "ariaMultiLine" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ariaMultiSelectable(): string | null {
		throw new UnexpectedCallError('Not supported "ariaMultiSelectable" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ariaOrientation(): string | null {
		throw new UnexpectedCallError('Not supported "ariaOrientation" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ariaOwnsElements(): readonly MLElement<T, O>[] | null {
		throw new UnexpectedCallError('Not supported "ariaOwnsElements" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ariaPlaceholder(): string | null {
		throw new UnexpectedCallError('Not supported "ariaPlaceholder" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ariaPosInSet(): string | null {
		throw new UnexpectedCallError('Not supported "ariaPosInSet" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ariaPressed(): string | null {
		throw new UnexpectedCallError('Not supported "ariaPressed" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ariaReadOnly(): string | null {
		throw new UnexpectedCallError('Not supported "ariaReadOnly" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ariaRequired(): string | null {
		throw new UnexpectedCallError('Not supported "ariaRequired" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ariaRelevant(): string | null {
		throw new UnexpectedCallError('Not supported "ariaRelevant" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ariaRoleDescription(): string | null {
		throw new UnexpectedCallError('Not supported "ariaRoleDescription" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ariaRowCount(): string | null {
		throw new UnexpectedCallError('Not supported "ariaRowCount" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ariaRowIndex(): string | null {
		throw new UnexpectedCallError('Not supported "ariaRowIndex" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ariaRowIndexText(): string | null {
		throw new UnexpectedCallError('Not supported "ariaRowIndexText" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ariaRowSpan(): string | null {
		throw new UnexpectedCallError('Not supported "ariaRowSpan" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ariaSelected(): string | null {
		throw new UnexpectedCallError('Not supported "ariaSelected" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ariaSetSize(): string | null {
		throw new UnexpectedCallError('Not supported "ariaSetSize" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ariaSort(): string | null {
		throw new UnexpectedCallError('Not supported "ariaSort" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ariaValueMax(): string | null {
		throw new UnexpectedCallError('Not supported "ariaValueMax" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ariaValueMin(): string | null {
		throw new UnexpectedCallError('Not supported "ariaValueMin" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ariaValueNow(): string | null {
		throw new UnexpectedCallError('Not supported "ariaValueNow" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ariaValueText(): string | null {
		throw new UnexpectedCallError('Not supported "ariaValueText" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Element`
	 * @see https://dom.spec.whatwg.org/#dom-slotable-assignedslot
	 */
	get assignedSlot(): HTMLSlotElement | null {
		throw new UnexpectedCallError('Not supported "assignedSlot" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get attributeStyleMap(): StylePropertyMap {
		throw new UnexpectedCallError('Not supported "attributeStyleMap" property');
	}

	/**
	 * @implements DOM API: `Element`
	 * @see https://dom.spec.whatwg.org/#dom-element-attributes
	 */
	get attributes(): MLNamedNodeMap<T, O> {
		const origin =
			this.pretenderContext?.type === 'pretender' ? this.pretenderContext.as.#attributes : this.#attributes;

		if (this.#normalizedAttrs.has(origin)) {
			return this.#normalizedAttrs.get(origin)!;
		}

		const names = new Set<string>();
		const attrs: MLAttr<T, O>[] = [];

		for (const attr of origin) {
			if (names.has(attr.name)) {
				/**
				 * Skips a duplicated attribute
				 *
				 *@see https://html.spec.whatwg.org/#parse-error-duplicate-attribute
				 */
				continue;
			}

			attrs.push(attr);
		}

		const map = toNamedNodeMap(attrs);
		this.#normalizedAttrs.set(origin, map);
		return map;
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get autocapitalize(): string {
		throw new UnexpectedCallError('Not supported "autocapitalize" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get autocorrect(): boolean {
		throw new UnexpectedCallError('Not supported "autocorrect" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get autofocus(): boolean {
		throw new UnexpectedCallError('Not supported "autofocus" property');
	}

	/**
	 * @implements DOM API: `Element`
	 * @see https://dom.spec.whatwg.org/#ref-for-dom-element-classlist%E2%91%A0
	 */
	get classList(): MLDomTokenList {
		const classAttrs = this.getAttributeToken('class');
		const value = classAttrs.map(c => c.value).join(' ');
		return new MLDomTokenList(value, classAttrs);
	}

	/**
	 * @implements DOM API: `Element`
	 * @see https://dom.spec.whatwg.org/#ref-for-dom-element-classname%E2%91%A0
	 */
	get className() {
		return this.classList.value;
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Element`
	 * @see https://www.w3.org/TR/cssom-view-1/#ref-for-dom-element-clientheight-1
	 */
	get clientHeight(): number {
		throw new UnexpectedCallError('Not supported "clientHeight" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Element`
	 * @see https://www.w3.org/TR/cssom-view-1/#ref-for-dom-element-clientleft-1
	 */
	get clientLeft(): number {
		throw new UnexpectedCallError('Not supported "clientLeft" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Element`
	 * @see https://www.w3.org/TR/cssom-view-1/#ref-for-dom-element-clienttop-1
	 */
	get clientTop(): number {
		throw new UnexpectedCallError('Not supported "clientTop" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Element`
	 * @see https://www.w3.org/TR/cssom-view-1/#ref-for-dom-element-clientwidth-1
	 */
	get clientWidth(): number {
		throw new UnexpectedCallError('Not supported "clientWidth" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get contentEditable(): string {
		throw new UnexpectedCallError('Not supported "contentEditable" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get currentCSSZoom(): number {
		throw new UnexpectedCallError('Not supported "currentCSSZoom" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get customElementRegistry(): CustomElementRegistry | null {
		throw new UnexpectedCallError('Not supported "customElementRegistry" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get dataset(): DOMStringMap {
		throw new UnexpectedCallError('Not supported "dataset" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get dir(): string {
		throw new UnexpectedCallError('Not supported "dir" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get draggable(): boolean {
		throw new UnexpectedCallError('Not supported "draggable" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get enterKeyHint(): string {
		throw new UnexpectedCallError('Not supported "enterKeyHint" property');
	}

	/**
	 * Whether this element has any spread attributes (e.g., `{...props}` in JSX).
	 */
	get hasSpreadAttr() {
		return this.#attributes.some(attr => attr.localName === '#spread');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get hidden(): boolean {
		throw new UnexpectedCallError('Not supported "hidden" property');
	}

	/**
	 * @implements DOM API: `Element`
	 * @see https://dom.spec.whatwg.org/#ref-for-dom-element-id%E2%91%A0
	 */
	get id() {
		return this.getAttribute('id') ?? '';
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 * @see https://html.spec.whatwg.org/multipage/interaction.html#dom-inert
	 */
	get inert(): boolean {
		throw new UnexpectedCallError('Not supported "inert" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Element`
	 * @see https://w3c.github.io/DOM-Parsing/#dom-innerhtml-innerhtml
	 */
	get innerHTML(): string {
		throw new UnexpectedCallError('Not supported "innerHTML" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get innerText(): string {
		throw new UnexpectedCallError('Not supported "innerText" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get inputMode(): string {
		throw new UnexpectedCallError('Not supported "inputMode" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get isContentEditable(): boolean {
		throw new UnexpectedCallError('Not supported "isContentEditable" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get lang(): string {
		throw new UnexpectedCallError('Not supported "lang" property');
	}

	/**
	 * Returns a lowercase name if it is an HTML element.
	 *
	 * ```html
	 * <div> => "div"
	 * <DIV> => "div"
	 * <svg> => "svg"
	 * <foreignObject> => "foreignObject"
	 * <x-foo> => "x-foo"
	 * <X-FOO> => "x-foo"
	 * ```
	 *
	 * @implements DOM API: `Element`
	 * @see https://dom.spec.whatwg.org/#ref-for-dom-element-localname%E2%91%A0
	 */
	get localName(): string {
		if (this.pretenderContext?.type === 'pretender') {
			return this.pretenderContext.as.localName;
		}
		if (this.isForeignElement || this.elementType !== 'html') {
			return this.#localName;
		}
		if (this.ownerMLDocument.tagNameCaseSensitive) {
			return this.#localName;
		}
		return this.#localName.toLowerCase();
	}

	/**
	 * The element immediately following the specified one in its parent's children list.
	 *
	 * @readonly
	 * @implements DOM API: `Element`
	 * @see https://dom.spec.whatwg.org/#ref-for-dom-nondocumenttypechildnode-nextelementsibling%E2%91%A1
	 */
	get nextElementSibling(): MLElement<T, O> | null {
		return nextElementSibling(this);
	}

	/**
	 * Returns a string appropriate for the type of node as `Element`
	 *
	 * @see https://dom.spec.whatwg.org/#ref-for-element%E2%91%A2%E2%93%AA
	 */
	get nodeName(): string {
		if (this.pretenderContext?.type === 'pretender') {
			return this.pretenderContext.as.nodeName;
		}
		if (this.isForeignElement || this.elementType !== 'html') {
			return this._astToken.nodeName;
		}
		return this._astToken.nodeName.toUpperCase();
	}

	/**
	 * Returns a number appropriate for the type of `Element`
	 */
	get nodeType(): ElementNodeType {
		return this.ELEMENT_NODE;
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get nonce(): string {
		throw new UnexpectedCallError('Not supported "nonce" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get offsetHeight(): number {
		throw new UnexpectedCallError('Not supported "offsetHeight" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get offsetLeft(): number {
		throw new UnexpectedCallError('Not supported "offsetLeft" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get offsetParent(): Element | null {
		throw new UnexpectedCallError('Not supported "offsetParent" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get offsetTop(): number {
		throw new UnexpectedCallError('Not supported "offsetTop" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get offsetWidth(): number {
		throw new UnexpectedCallError('Not supported "offsetWidth" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onabort():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: UIEvent,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onabort" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onanimationcancel():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: AnimationEvent,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onanimationcancel" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onanimationend():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: AnimationEvent,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onanimationend" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onanimationiteration():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: AnimationEvent,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onanimationiteration" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onanimationstart():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: AnimationEvent,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onanimationstart" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onauxclick():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: MouseEvent,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onauxclick" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onbeforematch():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: Event,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onbeforematch" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onbeforeinput():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: InputEvent,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onbeforeinput" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onbeforetoggle():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: Event,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onbeforetoggle" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onblur():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: FocusEvent,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onblur" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get oncancel():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: Event,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "oncanplay" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get oncanplay():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: Event,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "oncanplay" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get oncanplaythrough():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: Event,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "oncanplaythrough" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onchange():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: Event,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onchange" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onclick():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: MouseEvent,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onclick" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onclose():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: Event,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onclose" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get oncommand():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: Event,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "oncommand" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get oncontextlost():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: Event,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "oncontextlost" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get oncontextmenu():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: MouseEvent,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "oncontextmenu" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get oncontextrestored():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: Event,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "oncontextlost" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get oncopy():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: ClipboardEvent,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "oncopy" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get oncuechange():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: Event,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onpointerleave" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get oncut():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: ClipboardEvent,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onpointerleave" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ondblclick():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: MouseEvent,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "ondblclick" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ondrag():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: DragEvent,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "ondrag" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ondragend():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: DragEvent,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "ondragend" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ondragenter():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: DragEvent,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "ondragenter" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ondragleave():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: DragEvent,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "ondragleave" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ondragover():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: DragEvent,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "ondragover" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ondragstart():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: DragEvent,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "ondragstart" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ondrop():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: DragEvent,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "ondrop" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ondurationchange():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: Event,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "ondurationchange" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onemptied():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: Event,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onemptied" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onended():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: Event,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onended" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onerror(): OnErrorEventHandler {
		throw new UnexpectedCallError('Not supported "onerror" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onfocus():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: FocusEvent,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onfocus" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onformdata():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: FormDataEvent,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onformdata" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onfullscreenchange():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: Element,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: Event,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onfullscreenchange" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onfullscreenerror():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: Element,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: Event,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onfullscreenerror" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ongotpointercapture():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: PointerEvent,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "ongotpointercapture" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get oninput():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: Event,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "oninput" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get oninvalid():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: Event,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "oninvalid" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onkeydown():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: KeyboardEvent,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onkeydown" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onkeypress():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: KeyboardEvent,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onkeypress" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onkeyup():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: KeyboardEvent,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onkeyup" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onload():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: Event,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onload" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onloadeddata():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: Event,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onloadeddata" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onloadedmetadata():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: Event,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onloadedmetadata" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onloadstart():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: Event,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onloadstart" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onlostpointercapture():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: PointerEvent,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onlostpointercapture" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onmousedown():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: MouseEvent,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onmousedown" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onmouseenter():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: MouseEvent,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onmouseenter" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onmouseleave():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: MouseEvent,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onmouseleave" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onmousemove():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: MouseEvent,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onmousemove" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onmouseout():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: MouseEvent,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onmouseout" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onmouseover():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: MouseEvent,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onmouseover" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onmouseup():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: MouseEvent,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onmouseup" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onpaste():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: ClipboardEvent,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onpaste" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onpause():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: Event,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onpause" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onplay():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: Event,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onplay" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onplaying():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: Event,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onplaying" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onpointercancel():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: PointerEvent,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onpointercancel" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onpointerdown():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: PointerEvent,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onpointerdown" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onpointerenter():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: PointerEvent,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onpointerenter" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onpointerleave():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: PointerEvent,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onpointerleave" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onpointermove():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: PointerEvent,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onpointermove" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onpointerout():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: PointerEvent,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onpointerout" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onpointerover():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: PointerEvent,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onpointerover" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onpointerrawupdate():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: Event,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onpointerrawupdate" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onpointerup():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: PointerEvent,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onpointerup" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onprogress():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: ProgressEvent<EventTarget>,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onprogress" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onratechange():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: Event,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onratechange" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onreset():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: Event,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onreset" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onresize():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: UIEvent,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onresize" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onscroll():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: Event,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onscroll" property');
	}

	get onscrollend():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: Event,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onscrollend" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onsecuritypolicyviolation():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: SecurityPolicyViolationEvent,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onsecuritypolicyviolation" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onseeked():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: Event,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onseeked" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onseeking():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: Event,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onseeking" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onselect():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: Event,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onselect" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onselectionchange():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: Event,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onselectionchange" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onselectstart():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: Event,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onselectstart" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onslotchange():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: Event,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onslotchange" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onstalled():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: Event,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onstalled" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onsubmit():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: SubmitEvent,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onsubmit" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onsuspend():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: Event,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onsuspend" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ontimeupdate():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: Event,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "ontimeupdate" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ontoggle():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: Event,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "ontoggle" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ontransitioncancel():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: TransitionEvent,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "ontransitioncancel" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ontransitionend():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: TransitionEvent,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "ontransitionend" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ontransitionrun():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: TransitionEvent,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "ontransitionrun" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get ontransitionstart():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: TransitionEvent,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "ontransitionstart" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onvolumechange():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: Event,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onvolumechange" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onwaiting():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: Event,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onwaiting" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onwebkitanimationend():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: Event,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onwebkitanimationend" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onwebkitanimationiteration():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: Event,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onwebkitanimationiteration" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onwebkitanimationstart():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: Event,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onwebkitanimationstart" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onwebkittransitionend():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: Event,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onwebkittransitionend" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get onwheel():
		| ((
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				this: GlobalEventHandlers,
				// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
				ev: WheelEvent,
		  ) => any)
		| null {
		throw new UnexpectedCallError('Not supported "onwheel" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Element`
	 * @see https://w3c.github.io/DOM-Parsing/#dom-element-outerhtml
	 */
	get outerHTML(): string {
		throw new UnexpectedCallError('Not supported "outerHTML" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get outerText(): string {
		throw new UnexpectedCallError('Not supported "outerText" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Element`
	 * @see https://www.w3.org/TR/css-shadow-parts-1/#idl
	 */
	get part(): DOMTokenList {
		throw new UnexpectedCallError('Not supported "part" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Element`
	 * @see https://html.spec.whatwg.org/multipage/popover.html#dom-popover
	 */
	get popover(): string | null {
		throw new UnexpectedCallError('Not supported "popover" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Element`
	 * @see https://dom.spec.whatwg.org/#ref-for-dom-element-prefix%E2%91%A0
	 */
	get prefix(): string | null {
		throw new UnexpectedCallError('Not supported "prefix" property');
	}

	/**
	 * The element immediately prior the specified one in its parent's children list.
	 *
	 * @readonly
	 * @implements DOM API: `Element`
	 * @see https://dom.spec.whatwg.org/#ref-for-dom-nondocumenttypechildnode-previouselementsibling%E2%91%A1
	 */
	get previousElementSibling(): MLElement<T, O> | null {
		return previousElementSibling(this);
	}

	/**
	 * Returns the original raw element name exactly as it appears in the AST,
	 * without any case normalization or pretender resolution.
	 *
	 * @implements `@markuplint/ml-core` API: `MLElement`
	 */
	get rawName() {
		return this._astToken.nodeName;
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Element`
	 * @see https://w3c.github.io/aria/#ARIAMixin
	 */
	get role(): string {
		throw new UnexpectedCallError('Not supported "role" property');
	}

	/**
	 * Returns the rule configuration for this element, respecting the pretender context.
	 * If the element is a pretended origin, returns the rule from the pretending element.
	 * Rules are mapped only to nodes in the document's `nodeList`; the virtual
	 * pretender element never appears there, so it must read the resolved
	 * rules from the original element.
	 *
	 * @implements `@markuplint/ml-core` API: `MLNode`
	 */
	get rule(): RuleInfo<T, O> {
		if (this.pretenderContext?.type === 'origin') {
			return this.pretenderContext.origin.rule;
		}

		return super.rule;
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Element`
	 * @see https://www.w3.org/TR/cssom-view-1/#ref-for-dom-element-scrollheight-1
	 */
	get scrollHeight(): number {
		throw new UnexpectedCallError('Not supported "scrollHeight" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Element`
	 * @see https://www.w3.org/TR/cssom-view-1/#ref-for-dom-element-scrollleft-1
	 */
	get scrollLeft(): number {
		throw new UnexpectedCallError('Not supported "scrollLeft" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Element`
	 * @see https://www.w3.org/TR/cssom-view-1/#ref-for-dom-element-scrolltop-1
	 */
	get scrollTop(): number {
		throw new UnexpectedCallError('Not supported "scrollTop" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Element`
	 * @see https://www.w3.org/TR/cssom-view-1/#ref-for-dom-element-scrollwidth-1
	 */
	get scrollWidth(): number {
		throw new UnexpectedCallError('Not supported "scrollWidth" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Element`
	 * @see https://dom.spec.whatwg.org/#ref-for-dom-element-shadowroot%E2%91%A0
	 */
	get shadowRoot(): ShadowRoot | null {
		throw new UnexpectedCallError('Not supported "shadowRoot" property');
	}

	/**
	 * @implements DOM API: `Element`
	 * @see https://dom.spec.whatwg.org/#ref-for-dom-element-slot%E2%91%A0
	 */
	get slot() {
		return this.getAttribute('slot') ?? '';
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get spellcheck(): boolean {
		throw new UnexpectedCallError('Not supported "spellcheck" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get style(): CSSStyleDeclaration {
		throw new UnexpectedCallError('Not supported "style" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get tabIndex(): number {
		throw new UnexpectedCallError('Not supported "tabIndex" property');
	}

	/**
	 * Returns the HTML-uppercased qualified name.
	 *
	 * If this is in the HTML namespace and its node document is an HTML document, then set qualifiedName to qualifiedName in ASCII uppercase.
	 *
	 * (In markuplint evaluation, the node document always is an HTML document.)
	 *
	 * ```html
	 * <div> => "DIV"
	 * <svg> => "svg"
	 * <x-foo> => "X-FOO"
	 * ```
	 *
	 * @implements DOM API: `Element`
	 * @see https://dom.spec.whatwg.org/#ref-for-dom-element-tagname%E2%91%A0
	 */
	get tagName() {
		if (this.pretenderContext?.type === 'pretender') {
			return this.pretenderContext.as.nodeName;
		}
		return this.nodeName;
	}

	/**
	 * @implements DOM API: `Element`
	 * @see https://dom.spec.whatwg.org/#dom-node-textcontent
	 */
	get textContent(): string {
		return [...this.childNodes].map(child => child.textContent ?? '').join('');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get title(): string {
		throw new UnexpectedCallError('Not supported "title" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get translate(): boolean {
		throw new UnexpectedCallError('Not supported "translate" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	get writingSuggestions(): string {
		throw new UnexpectedCallError('Not supported "writingSuggestions" property');
	}

	/**
	 * @implements DOM API: `Element`
	 */
	after(
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		...nodes: (string | MLNode<any, any>)[]
	): void {
		after(this, ...nodes);
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Element`
	 * @see https://www.w3.org/TR/web-animations-1/#dom-animatable-animate
	 */
	animate(
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		keyframes: Keyframe[] | PropertyIndexedKeyframes | null,
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		options?: number | KeyframeAnimationOptions,
	): Animation {
		throw new UnexpectedCallError('Not supported "animate" method');
	}

	/**
	 * @see https://html.spec.whatwg.org/multipage/scripting.html#dom-slot-assignednodes
	 */
	assignedNodes() {
		if (this.localName !== 'slot') {
			throw new TypeError('assignedNodes is not a function');
		}

		return [];
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	attachInternals(): ElementInternals {
		throw new UnexpectedCallError('Not supported "attachInternals" method');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Element`
	 * @see https://dom.spec.whatwg.org/#ref-for-dom-element-attachshadow%E2%91%A0
	 */
	attachShadow(
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		init: ShadowRootInit,
	): ShadowRoot {
		throw new UnexpectedCallError('Not supported "attachShadow" method');
	}

	/**
	 * @implements DOM API: `Element`
	 */
	before(
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		...nodes: (string | MLElement<any, any>)[]
	): void {
		before(this, ...nodes);
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	blur(): void {
		throw new UnexpectedCallError('Not supported "blur" method');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	checkVisibility(
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		options?: CheckVisibilityOptions,
	): boolean {
		throw new UnexpectedCallError('Not supported "checkVisibility" method');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	click(): void {
		throw new UnexpectedCallError('Not supported "click" method');
	}

	/**
	 * @implements DOM API: `Element`
	 * @see https://dom.spec.whatwg.org/#ref-for-dom-element-closest%E2%91%A0
	 */
	closest(selectors: string): MLElement<T, O> | null {
		// eslint-disable-next-line unicorn/no-this-assignment, @typescript-eslint/no-this-alias
		let el: MLElement<T, O> | null = this;

		do {
			if (el.matches(selectors)) {
				return el;
			}
			el = el.parentElement;
		} while (el !== null && el.is(el.ELEMENT_NODE));

		return null;
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	computedStyleMap(): StylePropertyMapReadOnly {
		throw new UnexpectedCallError('Not supported "computedStyleMap" method');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	focus(
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		options?: FocusOptions,
	): void {
		throw new UnexpectedCallError('Not supported "focus" method');
	}

	/**
	 * Returns the accessible name of this element, with per-element memoization.
	 *
	 * On the first call for a given ARIA version the full AccName Computation
	 * algorithm runs (tree walk, `aria-labelledby` resolution, `<label>` lookup,
	 * etc.) and the result is stored in {@link #accessibleNameCache}.
	 * Subsequent calls for the same version return the cached value in O(1).
	 *
	 * **All callers that need the accessible name of an MLElement should use
	 * this method** rather than importing `getAccname()` directly, so that
	 * every consumer benefits from the shared cache. This includes the
	 * `:aria(has name)` selector in `@markuplint/selector`, which uses
	 * duck-typing to detect and call this method.
	 *
	 * Added as part of the fix for {@link https://github.com/markuplint/markuplint/issues/2179 | #2179}
	 * to eliminate redundant AccName computation across rules.
	 *
	 * @implements `@markuplint/ml-core` API: `MLElement`
	 * @param version - The ARIA specification version to use for computation
	 * @returns The computed accessible name string (may be empty)
	 */
	getAccessibleName(version: ARIAVersion): string {
		const cached = this.#accessibleNameCache.get(version);
		if (cached != null) {
			return cached;
		}
		const name = getAccname(this, version);
		this.#accessibleNameCache.set(version, name);
		return name;
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Element`
	 * @see https://www.w3.org/TR/web-animations-1/#dom-animatable-getanimations
	 */
	getAnimations(
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		options?: GetAnimationsOptions,
	): Animation[] {
		throw new UnexpectedCallError('Not supported "getAnimations" method');
	}

	/**
	 * @implements DOM API: `Element`
	 * @see https://dom.spec.whatwg.org/#ref-for-dom-element-getattribute%E2%91%A0
	 */
	getAttribute(attrName: string) {
		for (const attr of this.attributes) {
			if (attr.name.toLowerCase() === attrName.toLowerCase()) {
				return attr.value;
			}
		}
		return null;
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Element`
	 * @see https://dom.spec.whatwg.org/#dom-element-getattributenodens
	 */
	getAttributeNS(namespace: string | null, localName: string): string | null {
		throw new UnexpectedCallError('Not supported "getAttributeNS" method');
	}

	/**
	 * @implements DOM API: `Element`
	 * @see https://dom.spec.whatwg.org/#ref-for-dom-element-getattributenames%E2%91%A0
	 */
	getAttributeNames(): string[] {
		return [...this.attributes].map(attr => attr.name);
	}

	/**
	 * @implements DOM API: `Element`
	 * @see https://dom.spec.whatwg.org/#dom-element-getattributenode
	 */
	getAttributeNode(qualifiedName: string): MLAttr<T, O> | null {
		return this.getAttributeToken(qualifiedName)[0] ?? null;
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Element`
	 * @see https://dom.spec.whatwg.org/#dom-element-getattributenodens
	 */
	getAttributeNodeNS(namespace: string | null, localName: string): Attr | null {
		throw new UnexpectedCallError('Not supported "getAttributeNodeNS" method');
	}

	/**
	 * Gets the attribute value from the original (non-pretended) attributes list,
	 * bypassing any pretender context that might be active.
	 *
	 * Exists for the pretender ARIA `{ fromAttr }` accessible-name resolution:
	 * the source attribute (e.g. `label` on `<MyButton label="...">`) lives on
	 * the original component element, not on the virtual pretender element.
	 *
	 * @implements `@markuplint/ml-core` API: `MLElement`
	 * @param attrName - The attribute name to look up (case-insensitive)
	 * @returns The attribute value, or null if the attribute is not found
	 */
	getAttributePretended(attrName: string) {
		for (const attr of this.#attributes) {
			if (attr.name.toLowerCase() === attrName.toLowerCase()) {
				return attr.value;
			}
		}
		return null;
	}

	/**
	 * Returns all attribute tokens matching the given name, including duplicates.
	 * Unlike `getAttribute`, this returns the full `MLAttr` token objects.
	 *
	 * @implements `@markuplint/ml-core` API: `MLElement`
	 * @param attrName - The attribute name to look up (case-insensitive)
	 * @returns An array of matching attribute tokens
	 */
	getAttributeToken(attrName: string) {
		const attrs: MLAttr<T, O>[] = [];
		attrName = attrName.toLowerCase();
		for (const attr of this.getAttributeTokens()) {
			if (attr.name === attrName) {
				attrs.push(attr);
			}
		}
		return attrs;
	}

	/**
	 * Returns all attribute tokens for this element, respecting the pretender context.
	 * If the element is pretending to be another, returns the pretender's attributes.
	 *
	 * @implements `@markuplint/ml-core` API: `MLElement`
	 * @returns A frozen array of all attribute tokens
	 */
	getAttributeTokens() {
		return Object.freeze(
			this.pretenderContext?.type === 'pretender' ? this.pretenderContext.as.#attributes : this.#attributes,
		);
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Element`
	 * @see https://www.w3.org/TR/cssom-view-1/#ref-for-dom-element-getboundingclientrect-1
	 */
	getBoundingClientRect(): DOMRect {
		throw new UnexpectedCallError('Not supported "getBoundingClientRect" method');
	}

	/**
	 * Returns child elements and non-whitespace text nodes, skipping omitted elements
	 * by flattening their children into the result. Results are cached for performance.
	 *
	 * @implements `@markuplint/ml-core` API: `MLElement`
	 * @returns An array of child elements and non-whitespace text nodes
	 */
	getChildElementsAndTextNodeWithoutWhitespaces() {
		if (this.#getChildElementsAndTextNodeWithoutWhitespacesCache) {
			return this.#getChildElementsAndTextNodeWithoutWhitespacesCache;
		}
		const filteredNodes: (MLElement<T, O> | MLText<T, O>)[] = [];
		for (const node of this.childNodes) {
			if (node.is(node.ELEMENT_NODE)) {
				if (node.isOmitted) {
					const children = node.getChildElementsAndTextNodeWithoutWhitespaces();
					filteredNodes.push(...children);
				} else {
					filteredNodes.push(node);
				}
			}
			if (node.is(node.TEXT_NODE) && !node.isWhitespace()) {
				filteredNodes.push(node);
			}
		}
		this.#getChildElementsAndTextNodeWithoutWhitespacesCache = filteredNodes;
		return filteredNodes;
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Element`
	 * @see https://www.w3.org/TR/cssom-view-1/#ref-for-dom-element-getclientrects-1
	 */
	getClientRects(): DOMRectList {
		throw new UnexpectedCallError('Not supported "getClientRects" method');
	}

	/**
	 * @implements DOM API: `Element`
	 * @see https://dom.spec.whatwg.org/#ref-for-dom-element-getelementsbyclassname
	 */
	getElementsByClassName(classNames: string): HTMLCollectionOf<MLElement<T, O>> {
		return toHTMLCollection(
			this._descendantsToArray<MLElement<T, O>>(node => {
				if (node.is(node.ELEMENT_NODE) && node.classList.contains(classNames)) {
					return node;
				}
			}),
		);
	}

	/**
	 * @implements DOM API: `Element`
	 * @see https://dom.spec.whatwg.org/#ref-for-dom-element-getelementsbyclassname
	 */
	getElementsByTagName(qualifiedName: string): ReturnType<(typeof Element)['prototype']['getElementsByTagName']> {
		return toHTMLCollection(
			this._descendantsToArray<MLElement<T, O>>(node => {
				if (node.is(node.ELEMENT_NODE) && node.nodeName.toLowerCase() === qualifiedName.toLowerCase()) {
					return node;
				}
			}),
		);
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Element`
	 * @see https://dom.spec.whatwg.org/#dom-element-getelementsbytagnamens
	 */
	getElementsByTagNameNS(namespace: any, localName: any): any {
		throw new UnexpectedCallError('Not supported "getElementsByTagNameNS" method');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Element`
	 * @see https://html.spec.whatwg.org/multipage/dynamic-markup-insertion.html#dom-element-gethtml
	 */
	getHTML(options?: any): string {
		throw new UnexpectedCallError('Does not implement "getHTML" method yet');
	}

	/**
	 * Returns the source location of the element's tag name (excluding the opening `<` character).
	 *
	 * @implements `@markuplint/ml-core` API: `MLElement`
	 * @returns An object with `offset`, `line`, and `col` properties indicating where the name starts
	 */
	getNameLocation() {
		return {
			offset: this.startOffset,
			line: this.startLine,
			col: this.startCol + this.tagOpenChar.length,
		};
	}

	/**
	 * @implements DOM API: `Element`
	 * @see https://dom.spec.whatwg.org/#ref-for-dom-element-hasattribute%E2%91%A0
	 */
	hasAttribute(qualifiedName: string): boolean {
		return this.getAttribute(qualifiedName) !== null;
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Element`
	 * @see https://dom.spec.whatwg.org/#ref-for-dom-element-hasattributens%E2%91%A0
	 */
	hasAttributeNS(namespace: string | null, localName: string): boolean {
		throw new UnexpectedCallError('Not supported "hasAttributeNS" method');
	}

	/**
	 * @implements DOM API: `Element`
	 * @see https://dom.spec.whatwg.org/#dom-element-hasattributes
	 */
	hasAttributes() {
		return this.attributes.length > 0;
	}

	/**
	 * Checks whether this element has any mutable attributes, such as spread
	 * attributes or attributes with dynamic values from template expressions.
	 *
	 * @implements `@markuplint/ml-core` API: `MLElement`
	 * @returns True if any attribute is dynamic or lacks a name node (spread)
	 */
	hasMutableAttributes() {
		for (const attr of this.attributes) {
			if (!attr.nameNode) {
				return true;
			}
			if (attr.isDynamicValue) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Checks whether this element has children that are potentially mutable,
	 * such as preprocessor-specific blocks, slot elements, or (optionally) elements
	 * with dynamic attributes.
	 *
	 * Blocks that carry a `blockBehavior` are not treated as mutable because
	 * their branches are deterministically enumerable via
	 * `conditionalChildNodes()`; blocks without one (e.g. expression output
	 * like `{value}`) can produce arbitrary content, so the children are
	 * considered mutable.
	 *
	 * @implements `@markuplint/ml-core` API: `MLElement`
	 * @param attr - When true, also considers children with mutable attributes as mutable
	 * @returns True if this element has potentially mutable children
	 */
	hasMutableChildren(attr = false) {
		for (const child of this.getPureChildNodes()) {
			if (child.is(child.MARKUPLINT_PREPROCESSOR_BLOCK)) {
				if (child.blockBehavior) {
					continue;
				}
				return true;
			}
			if (child.is(child.ELEMENT_NODE)) {
				if (attr && child.hasMutableAttributes()) {
					return true;
				}
				if (child.hasMutableChildren(attr)) {
					return true;
				}
				if (child.localName === 'slot') {
					return true;
				}
			}
		}
		return false;
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Element`
	 * @see https://www.w3.org/TR/pointerevents2/#dom-element-haspointercapture
	 */
	hasPointerCapture(pointerId: number): boolean {
		throw new UnexpectedCallError('Not supported "hasPointerCapture" method');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Element`
	 * @see https://html.spec.whatwg.org/multipage/popover.html#dom-hidepopover
	 */
	hidePopover(): void {
		throw new UnexpectedCallError('Not supported "hidePopover" method');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Element`
	 * @see https://dom.spec.whatwg.org/#dom-element-insertadjacentelement
	 */
	insertAdjacentElement(
		where: InsertPosition,
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		element: MLElement<T, O>,
	): MLElement<T, O> | null {
		throw new UnexpectedCallError('Does not implement "insertAdjacentElement" method yet');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Element`
	 * @see https://w3c.github.io/DOM-Parsing/#widl-Element-insertAdjacentHTML-void-DOMString-position-DOMString-text
	 */
	insertAdjacentHTML(position: InsertPosition, text: string): void {
		throw new UnexpectedCallError('Does not implement "insertAdjacentHTML" method yet');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Element`
	 * @see https://dom.spec.whatwg.org/#dom-element-insertadjacenttext
	 */
	insertAdjacentText(where: InsertPosition, data: string): void {
		throw new UnexpectedCallError('Does not implement "insertAdjacentText" method yet');
	}

	/**
	 * Checks whether this element is a descendant of any element whose UUID
	 * is in the given list, by walking up the parent element chain.
	 *
	 * @implements `@markuplint/ml-core` API: `MLElement`
	 * @param uuidList - A list of element UUIDs to check against
	 * @returns True if any ancestor element's UUID is in the list
	 */
	isDescendantByUUIDList(uuidList: readonly string[]) {
		let el = this.parentElement;

		if (el === null) {
			return false;
		}

		do {
			if (uuidList.includes(el.uuid)) {
				return true;
			}
			el = el.parentElement;
		} while (el !== null && el.is(el.ELEMENT_NODE));
		return false;
	}

	/**
	 * Checks whether this element has no meaningful child content
	 * (only whitespace-only text nodes or no children at all).
	 *
	 * @implements `@markuplint/ml-core` API: `MLElement`
	 * @returns True if the element has no non-whitespace child content
	 */
	isEmpty() {
		for (const childNode of this.childNodes) {
			if (!(childNode.is(childNode.TEXT_NODE) && childNode.textContent?.trim() === '')) {
				return false;
			}
		}
		return true;
	}

	/**
	 * @implements DOM API: `Element`
	 * @see https://dom.spec.whatwg.org/#ref-for-dom-element-matches%E2%91%A0
	 */
	matches<K extends keyof HTMLElementTagNameMap>(selectors: K): this is HTMLElementTagNameMap[K];
	matches<K extends keyof SVGElementTagNameMap>(selectors: K): this is SVGElementTagNameMap[K];
	matches<K extends keyof MathMLElementTagNameMap>(selectors: K): this is MathMLElementTagNameMap[K];
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	matches(selectors: string, scope?: MLParentNode<T, O>): boolean;
	matches(
		selector: string,
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		scope?: MLParentNode<T, O>,
	): boolean {
		return this.matchMLSelector(selector, scope).matched;
	}

	/**
	 * Matches this element against a CSS selector or regex selector pattern,
	 * returning detailed match results. When the element is a pretender,
	 * it attempts to match both as the pretender and as the original element.
	 *
	 * The two-phase strategy lets both targeting styles work: selectors for
	 * the semantic element (e.g. `button`) match via the pretender identity,
	 * while selectors for the component name (e.g. `MyButton`) still match
	 * the original.
	 *
	 * @param selector - The CSS selector string or regex selector to match against
	 * @param scope - An optional scope node for scoped selector matching
	 * @returns The detailed match result including captured groups from regex selectors
	 */
	matchMLSelector(
		selector: string | RegexSelector | undefined,
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		scope?: MLParentNode<T, O>,
	): SelectorMatches {
		if (this.pretenderContext?.type === 'pretender') {
			// matched = selectorMatcher.match(this, scope) !== false;
			const matched = matchSelector(this, selector, scope, this.ownerMLDocument.specs);
			if (matched.matched) {
				return matched;
			}
		}

		let _pretender: PretenderContextPretender<MLElement<T, O>, T, O> | null = null;
		// don't expose pretenders temporarily
		if (this.pretenderContext?.type === 'pretender') {
			_pretender = this.pretenderContext;
			this.pretenderContext = null;
		}

		const matched = matchSelector(this, selector, scope, this.ownerMLDocument.specs);

		if (_pretender) {
			this.pretenderContext = _pretender;
		}

		return matched;
	}

	/**
	 * Initializes the pretender context for this element based on the given pretender
	 * configurations. If a matching pretender is found or the element has an `as` attribute,
	 * sets up the pretender/pretended relationship between elements.
	 *
	 * @param pretenders - Optional array of pretender configurations to match against
	 */
	pretending(pretenders?: readonly Pretender[]) {
		// Pretender must not apply to a recognised standard HTML element (e.g. <marquee>,
		// <h1>, <button>). Allowing such elements to masquerade as another would silently
		// mask spec-driven rules — deprecation, ARIA role restrictions, browser support —
		// keyed on the original tag. See issue #3740.
		//
		// Names that the HTML parser cannot distinguish from typos (PascalCase JSX-like
		// usage in plain HTML such as `<SimpleButton>`) get `elementType === 'html'`
		// from the parser but have no spec entry; those remain pretender-eligible
		// (this is what `pretenders.scan` relies on). The legacy "no inline `as=` on
		// HTML elements" guard is preserved further down for that case.
		if (
			this.elementType === 'html' &&
			getSpecByTagName(this.ownerMLDocument.specs.specs, this.localName, this.namespaceURI) != null
		) {
			return;
		}
		const pretenderConfig = pretenders?.find(option => this.matches(option.selector));
		const asAttrValue = this.getAttribute('as');
		const pretenderElement: Pretender['as'] | null =
			pretenderConfig?.as ??
			(this.elementType === 'html' || !asAttrValue
				? null
				: {
						element: asAttrValue,
						inheritAttrs: true,
					});

		if (pretenderElement == null) {
			return;
		}

		let nodeName: string;
		let namespace: NamespaceURI = 'http://www.w3.org/1999/xhtml';
		const attributes: MLASTAttr[] = [];
		let aria: PretenderARIA | undefined;
		if (typeof pretenderElement === 'string') {
			nodeName = pretenderElement;
		} else {
			nodeName = pretenderElement.element;
			namespace = pretenderElement.namespace === 'svg' ? 'http://www.w3.org/2000/svg' : namespace;
			if (pretenderElement.inheritAttrs) {
				attributes.push(...this._astToken.attributes);
			}
			if (pretenderElement.attrs) {
				attributes.push(
					...pretenderElement.attrs.map(({ name, value }, i) => {
						const _value =
							value == null
								? ''
								: typeof value === 'string'
									? value
									: (this.getAttribute(value.fromAttr) ?? '');
						return {
							...this._astToken,
							uuid: `${this.uuid}_attr_${i}`,
							type: 'attr',
							nodeName: name,
							spacesBeforeName: {
								...this._astToken,
								raw: '',
							},
							name: {
								...this._astToken,
								raw: name,
							},
							spacesBeforeEqual: {
								...this._astToken,
								raw: '',
							},
							equal: {
								...this._astToken,
								raw: '',
							},
							spacesAfterEqual: {
								...this._astToken,
								raw: '',
							},
							startQuote: {
								...this._astToken,
								raw: '',
							},
							value: {
								...this._astToken,
								raw: _value,
							},
							endQuote: {
								...this._astToken,
								raw: '',
							},
							isDuplicatable: true,
							parentNode: null,
							nextNode: null,
							prevNode: null,
							isFragment: false,
							isGhost: false,
						} as MLASTAttr;
					}),
				);
			}
			aria = pretenderElement.aria;
		}

		const slots = typeof pretenderElement === 'string' ? undefined : pretenderElement.slots;

		const as = new MLElement<T, O>(
			{
				...this._astToken,
				uuid: this.uuid + '_pretender',
				raw: `<${nodeName}>`,
				nodeName,
				namespace,
				elementType: 'html',
				attributes,
			},
			this.ownerMLDocument,
		);

		// When slots is null, the component does not accept children (void-like).
		// Explicitly set empty children to prevent inheriting from the AST token.
		if (slots === null) {
			as.resetChildren(toNodeList([]));
		} else {
			as.resetChildren(this.childNodes);
		}
		as.pretenderContext = {
			type: 'origin',
			origin: this,
		};

		this.pretenderContext = {
			type: 'pretender',
			as,
			aria,
		};
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Element`
	 * @see https://www.w3.org/TR/pointerevents2/#dom-element-releasepointercapture
	 */
	releasePointerCapture(pointerId: number): void {
		throw new UnexpectedCallError('Not supported "releasePointerCapture" method');
	}

	/**
	 * @implements DOM API: `Element`
	 */
	remove(): void {
		remove(this);
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Element`
	 * @see https://dom.spec.whatwg.org/#dom-element-removeattribute
	 */
	removeAttribute(qualifiedName: string): void {
		throw new UnexpectedCallError('Not supported "removeAttribute" method');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Element`
	 * @see https://dom.spec.whatwg.org/#ref-for-dom-element-removeattributens%E2%91%A0
	 */
	removeAttributeNS(namespace: string | null, localName: string): void {
		throw new UnexpectedCallError('Not supported "removeAttributeNS" method');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Element`
	 * @see https://www.w3.org/TR/DOM-Level-2-Core/core.html#ID-D589198
	 */
	removeAttributeNode(
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		attr: Attr,
	): Attr {
		throw new UnexpectedCallError('Not supported "removeAttributeNode" method');
	}

	/**
	 * @implements DOM API: `Element`
	 */
	replaceWith(
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		...nodes: (string | MLElement<any, any>)[]
	): void {
		replaceWith(this, ...nodes);
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Element`
	 * @see https://fullscreen.spec.whatwg.org/#dom-element-requestfullscreen
	 */
	requestFullscreen(
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		options?: FullscreenOptions,
	): Promise<void> {
		throw new UnexpectedCallError('Not supported "requestFullscreen" method');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Element`
	 * @see https://w3c.github.io/pointerlock/#dom-element-requestpointerlock
	 */
	requestPointerLock(options?: any): Promise<void> {
		throw new UnexpectedCallError('Not supported "requestPointerLock" method');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Element`
	 * @see https://www.w3.org/TR/cssom-view-1/#dom-element-scroll
	 */
	scroll(x?: any, y?: any): void {
		throw new UnexpectedCallError('Not supported "scroll" method');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Element`
	 * @see https://www.w3.org/TR/cssom-view-1/#dom-element-scrollby
	 */
	scrollBy(x?: any, y?: any): void {
		throw new UnexpectedCallError('Not supported "scrollBy" method');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Element`
	 * @see https://www.w3.org/TR/cssom-view-1/#dom-element-scrollintoview
	 */
	scrollIntoView(
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		arg?: boolean | ScrollIntoViewOptions,
	): void {
		throw new UnexpectedCallError('Not supported "scrollIntoView" method');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Element`
	 * @see https://www.w3.org/TR/cssom-view-1/#dom-element-scrollto
	 */
	scrollTo(x?: any, y?: any): void {
		throw new UnexpectedCallError('Not supported "scrollTo" method');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Element`
	 * @see https://dom.spec.whatwg.org/#ref-for-dom-element-setattribute%E2%91%A0
	 */
	setAttribute(qualifiedName: string, value: string): void {
		throw new UnexpectedCallError('Not supported "setAttribute" method');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Element`
	 * @see https://dom.spec.whatwg.org/#ref-for-dom-element-setattributens%E2%91%A0
	 */
	setAttributeNS(namespace: string | null, qualifiedName: string, value: string): void {
		throw new UnexpectedCallError('Not supported "setAttributeNS" method');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Element`
	 * @see https://dom.spec.whatwg.org/#dom-element-setattributenode
	 */
	setAttributeNode(
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		attr: Attr,
	): Attr | null {
		throw new UnexpectedCallError('Not supported "setAttributeNode" method');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Element`
	 * @see https://dom.spec.whatwg.org/#dom-element-setattributenodens
	 */
	setAttributeNodeNS(
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		attr: Attr,
	): Attr | null {
		throw new UnexpectedCallError('Not supported "setAttributeNodeNS" method');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Element`
	 * @see https://html.spec.whatwg.org/multipage/dynamic-markup-insertion.html#dom-element-sethtmlunsafe
	 */
	setHTMLUnsafe(html: string): void {
		throw new UnexpectedCallError('Not supported "setHTMLUnsafe" method');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Element`
	 * @see https://www.w3.org/TR/pointerevents2/#idl-def-element-setpointercapture-pointerid
	 */
	setPointerCapture(pointerId: number): void {
		throw new UnexpectedCallError('Not supported "setPointerCapture" method');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Element`
	 * @see https://html.spec.whatwg.org/multipage/popover.html#dom-showpopover
	 */
	showPopover(): void {
		throw new UnexpectedCallError('Not supported "showPopover" method');
	}

	/**
	 * Returns a normalized string representation of this element including its tag name,
	 * attributes, and child content. Whitespace-only text nodes are excluded.
	 * The result is cached for repeated calls.
	 *
	 * @implements `@markuplint/ml-core` API: `MLElement`
	 * @returns The normalized HTML string of this element
	 */
	toNormalizeString(): string {
		if (this.#normalizedString) {
			return this.#normalizedString;
		}

		const children = this.getChildElementsAndTextNodeWithoutWhitespaces();
		const attrs = this.attributes.map(attr => attr.toNormalizeString());
		const attrString = attrs.length > 0 ? ' ' + attrs.join('') : '';
		const startTag = `<${this.nodeName}${attrString}>`;
		const childNodes = children.map(node => {
			if (node.is(node.ELEMENT_NODE)) {
				return node.toNormalizeString();
			}
			return node.raw;
		});
		const endTag = `</${this.nodeName}>`;
		const normalizedString = `${startTag}${childNodes.join('')}${endTag}`;

		this.#normalizedString = normalizedString;
		return normalizedString;
	}

	/**
	 * Returns the raw string representation of this element.
	 *
	 * @implements `@markuplint/ml-core` API: `MLElement`
	 * @returns The string content of this element
	 */
	toString() {
		return this.raw;
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Element`
	 * @see https://dom.spec.whatwg.org/#ref-for-dom-element-toggleattribute%E2%91%A0
	 */
	toggleAttribute(qualifiedName: string, force?: boolean): boolean {
		throw new UnexpectedCallError('Not supported "toggleAttribute" method');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Element`
	 * @see https://html.spec.whatwg.org/multipage/popover.html#dom-togglepopover
	 */
	togglePopover(force?: boolean): boolean {
		throw new UnexpectedCallError('Not supported "togglePopover" method');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Element`
	 */
	webkitMatchesSelector(selectors: string): boolean {
		throw new UnexpectedCallError('Not supported "webkitMatchesSelector" method');
	}
}
