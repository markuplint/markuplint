import type { MLBlock } from './block.js';
import type { MLChildNode } from './child-node.js';
import type { MLDocumentFragment } from './document-fragment.js';
import type { MLDocument } from './document.js';
import type { MLElement } from './element.js';
import type { MarkuplintPreprocessorBlockType, NodeType, NodeTypeOf } from './types.js';
import type { RuleInfo } from '../../index.js';
import type { MLASTChildNode, MLASTElementCloseTag, MLASTInvalid, MLASTNode } from '@markuplint/ml-ast';
import type { AnyRule, PlainData, Rule, RuleConfigValue } from '@markuplint/ml-config';

import { branchesToPatterns, UnexpectedCallError } from '@markuplint/shared';

import { MLToken } from '../token/token.js';

import { isChildNode } from './child-node.js';
import { toNodeList } from './node-list.js';
import { NodeStore } from './node-store.js';

/**
 * How many patterns the chains of elements make at most (`v-if`, `v-else-if` and `v-else` of Vue, in
 * `MLNode#alternativeChildNodes` and `MLNode#conditionalChildNodes`). The chains of a parent multiply: `n`
 * pairs of `v-if` and `v-else` make `2^n`, and a long form has many. 64 is six such pairs, which is more than
 * markup written by hand has among the children of one element, and a rule that reads every pattern stays
 * fast. Past the limit the elements of the further chains are read as written, all rendered together, so a rule
 * may report the elements of a pair as if both were rendered: it can over-report there, where the cap of
 * `permitted-contents` for transparent elements under-reports.
 */
const MAX_ALTERNATIVE_PATTERNS = 64;

/**
 * Abstract base class for all markuplint DOM node wrappers.
 * Extends `MLToken` with DOM `Node` interface compliance, tree traversal,
 * rule configuration access, and child node management.
 *
 * The `implements Node` declaration is a maintenance strategy: conforming to
 * the built-in DOM interfaces makes the compiler report errors whenever the
 * TypeScript DOM type definitions gain new members, so the MLDOM API surface
 * never drifts from the DOM Standard unnoticed. Members that are meaningless
 * in static analysis (mutation, events, layout) are stubbed to throw
 * `UnexpectedCallError` instead of being implemented.
 *
 * The `T`/`O` generics exist solely for rule authors using `createRule`:
 * they propagate through the node tree so that `node.rule` is typed as
 * `RuleInfo<T, O>` inside `verify()`/`fix()` callbacks. They are a
 * compile-time-only mechanism — see the `rules` field for the runtime side.
 *
 * @template T - The rule configuration value type
 * @template O - The rule options type
 * @template A - The underlying AST node type
 */
export abstract class MLNode<
	T extends RuleConfigValue,
	O extends PlainData = undefined,
	A extends MLASTNode = MLASTNode,
>
	extends MLToken<A>
	implements Node
{
	/**
	 * @implements DOM API: `Node`
	 * @see https://dom.spec.whatwg.org/#interface-node
	 */
	readonly ATTRIBUTE_NODE = 2;

	/**
	 * @implements DOM API: `Node`
	 * @see https://dom.spec.whatwg.org/#interface-node
	 */
	readonly CDATA_SECTION_NODE = 4;

	/**
	 * @implements DOM API: `Node`
	 * @see https://dom.spec.whatwg.org/#interface-node
	 */
	readonly COMMENT_NODE = 8;

	/**
	 * @implements DOM API: `Node`
	 * @see https://dom.spec.whatwg.org/#interface-node
	 */
	readonly DOCUMENT_FRAGMENT_NODE = 11;

	/**
	 * @implements DOM API: `Node`
	 * @see https://dom.spec.whatwg.org/#interface-node
	 */
	readonly DOCUMENT_NODE = 9;

	/**
	 * @implements DOM API: `Node`
	 * @see https://dom.spec.whatwg.org/#dom-node-document_position_contained_by
	 */
	readonly DOCUMENT_POSITION_CONTAINED_BY = 0b1_0000;

	/**
	 * @implements DOM API: `Node`
	 * @see https://dom.spec.whatwg.org/#dom-node-document_position_contains
	 */
	readonly DOCUMENT_POSITION_CONTAINS = 0b1000;

	/**
	 * @implements DOM API: `Node`
	 * @see https://dom.spec.whatwg.org/#dom-node-document_position_disconnected
	 */
	readonly DOCUMENT_POSITION_DISCONNECTED = 0b1;

	/**
	 * @implements DOM API: `Node`
	 * @see https://dom.spec.whatwg.org/#dom-node-document_position_following
	 */
	readonly DOCUMENT_POSITION_FOLLOWING = 0b100;

	/**
	 * @implements DOM API: `Node`
	 * @see https://dom.spec.whatwg.org/#dom-node-document_position_implementation_specific
	 */
	readonly DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC = 0b10_0000;

	/**
	 * @implements DOM API: `Node`
	 * @see https://dom.spec.whatwg.org/#dom-node-document_position_preceding
	 */
	readonly DOCUMENT_POSITION_PRECEDING = 0b10;

	/**
	 * @implements DOM API: `Node`
	 * @see https://dom.spec.whatwg.org/#interface-node
	 */
	readonly DOCUMENT_TYPE_NODE = 10;

	/**
	 * @implements DOM API: `Node`
	 * @see https://dom.spec.whatwg.org/#interface-node
	 */
	readonly ELEMENT_NODE = 1;

	/**
	 * @deprecated
	 * @implements DOM API: `Node`
	 * @see https://dom.spec.whatwg.org/#interface-node
	 */
	readonly ENTITY_NODE = 6;

	/**
	 * @deprecated
	 * @implements DOM API: `Node`
	 * @see https://dom.spec.whatwg.org/#interface-node
	 */
	readonly ENTITY_REFERENCE_NODE = 5;

	/**
	 * @implements `@markuplint/ml-core` API: `MLNode`
	 */
	readonly MARKUPLINT_PREPROCESSOR_BLOCK: MarkuplintPreprocessorBlockType = 101;

	/**
	 * @deprecated
	 * @implements DOM API: `Node`
	 * @see https://dom.spec.whatwg.org/#interface-node
	 */
	readonly NOTATION_NODE = 12;

	/**
	 * @implements DOM API: `Node`
	 * @see https://dom.spec.whatwg.org/#interface-node
	 */
	readonly PROCESSING_INSTRUCTION_NODE = 7;

	/**
	 * @implements DOM API: `Node`
	 * @see https://dom.spec.whatwg.org/#interface-node
	 */
	readonly TEXT_NODE = 3;

	#pureChildNodesCache: NodeListOf<MLChildNode<T, O>> | undefined;

	/**
	 * Returns child nodes when parent node access by `childNodes` property.
	 */
	readonly isFragment: boolean;

	readonly #ownerDocument: MLDocument<T, O>;

	/**
	 * Scoped to the owning document so the mapping is reclaimed together with
	 * it, and held directly on each node so the hot `syntacticalParentNode` /
	 * `getPureChildNodes` paths reach it without a lookup.
	 */
	readonly #nodeStore: NodeStore;

	#prevToken: MLNode<T, O> | null | undefined;

	#conditionalChildNodes: NodeListOf<MLChildNode<T, O>>[] | undefined;
	#alternativeChildNodes: NodeListOf<MLChildNode<T, O>>[] | undefined;

	/**
	 * Rules mapped to this node by `RuleMapper`. Deliberately untyped
	 * (`AnyRule`) storage: the `T`/`O` generics are not enforced at runtime —
	 * the `rule` getter recovers the typed `RuleInfo<T, O>` via a cast.
	 */
	readonly rules: Record<string, AnyRule> = {};

	protected _astToken: A;

	constructor(
		astNode: A,
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		document: MLDocument<T, O>,
		isFragment?: boolean,
	) {
		super(astNode);
		this._astToken = astNode;
		this.#ownerDocument = document;
		this.isFragment = !!isFragment;
		// `document` is `null` only for the `MLDocument` being constructed (see
		// its `super(ast, null)` call), which creates the store its nodes share.
		// The document node is deliberately not registered: its AST node has no
		// `uuid`, and nothing resolves it through the store (see
		// `syntacticalParentNode`, which returns `ownerMLDocument` directly).
		if (document) {
			this.#nodeStore = document.#nodeStore;
			this.#nodeStore.setNode(astNode, this);
		} else {
			this.#nodeStore = new NodeStore();
		}
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Node`
	 * @see https://dom.spec.whatwg.org/#ref-for-dom-node-baseuri%E2%91%A0
	 */
	get baseURI(): string {
		throw new UnexpectedCallError('Not supported "baseURI" property');
	}

	/**
	 * The list of child nodes. Fragment nodes, preprocessor blocks whose
	 * `blockBehavior.type` is `each` or `end`, and a `template` that Vue renders away
	 * for `v-for` are flattened into this list.
	 * Conditional blocks (`if`, `switch`, `await`, and their clauses) and
	 * `each:empty` stay in this list: flattening a conditional block would
	 * present elements that never render together as siblings, and would
	 * remove the block nodes `conditionalChildNodes()` uses to enumerate
	 * each branch. A loop body is not an alternative branch, so `each` and
	 * `end` are flattened.
	 *
	 * @readonly
	 * @implements DOM API: `Node`
	 * @see https://dom.spec.whatwg.org/#ref-for-dom-node-childnodes%E2%91%A0
	 */
	get childNodes(): NodeListOf<MLChildNode<T, O>> {
		const pureChildNodes = [...this.getPureChildNodes()];

		const childNodes = pureChildNodes.flatMap(node => {
			if (
				node.isFragment ||
				(node.is(node.MARKUPLINT_PREPROCESSOR_BLOCK) &&
					['each', 'end'].includes(node.blockBehavior?.type ?? '')) ||
				(node.is(node.ELEMENT_NODE) && node.blockBehavior?.type === 'each' && node.isRenderedAway)
			) {
				return [...node.childNodes];
			}
			return [node];
		});

		return toNodeList(childNodes);
	}

	/**
	 * The first node that may be `Element`, `Text`, and `CommentNode`.
	 *
	 * @readonly
	 * @implements DOM API: `Node`
	 * @see https://dom.spec.whatwg.org/#ref-for-dom-node-firstchild%E2%91%A0
	 */
	get firstChild(): MLChildNode<T, O> | null {
		return this.childNodes[0] ?? null;
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Node`
	 * @see https://dom.spec.whatwg.org/#ref-for-dom-node-isconnected%E2%91%A0
	 */
	get isConnected(): boolean {
		throw new UnexpectedCallError('Not supported "isConnected" property');
	}

	/**
	 * The last node that may be `Element`, `Text`, and `CommentNode`.
	 *
	 * @readonly
	 * @implements DOM API: `Node`
	 * @see https://dom.spec.whatwg.org/#ref-for-dom-node-lastchild%E2%91%A0
	 */
	get lastChild(): MLChildNode<T, O> | null {
		// eslint-disable-next-line unicorn/prefer-at
		return this.childNodes[this.childNodes.length - 1] ?? null;
	}

	/**
	 * The next node in the syntactical sibling list which, unlike
	 * `nextSibling`, includes `MLBlock` nodes (AST-level traversal).
	 *
	 * @implements `@markuplint/ml-core` API: `MLNode`
	 */
	get nextNode(): MLNode<T, O> | null {
		const siblings = [...(this.syntacticalParentNode?.childNodes ?? this.#ownerDocument.nodeList)];
		const index = siblings.findIndex(node => node.uuid === this.uuid);
		return siblings[index + 1] ?? null;
	}

	/**
	 * The next sibling of an object is its first following sibling or null if it has no following sibling.
	 *
	 * @implements DOM API: `Node`
	 * @see https://dom.spec.whatwg.org/#concept-tree-next-sibling
	 */
	get nextSibling(): MLChildNode<T, O> | null {
		let nextNode = this.nextNode;
		while (nextNode) {
			if (
				isChildNode(nextNode) &&
				((this.parentNode === null && nextNode.parentNode === null) ||
					this.parentNode?.uuid === nextNode.parentNode?.uuid)
			) {
				return nextNode;
			}
			nextNode = nextNode.nextNode;
		}
		return null;
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * It must not call from the instance of the `MLNode` class.
	 *
	 * @implements DOM API: `Node`
	 * @see https://dom.spec.whatwg.org/#ref-for-dom-node-nodename%E2%91%A0
	 */
	get nodeName(): string {
		throw new Error('It must not call from the instance of the `MLNode` class');
	}

	/**
	 * @implements DOM API: `Node`
	 * @see https://dom.spec.whatwg.org/#ref-for-dom-node-nodetype%E2%91%A0
	 */
	get nodeType(): NodeType | -1 {
		return -1;
	}

	/**
	 * The nodeValue getter steps are to return the following, switching on the interface this implements:
	 *
	 * - `Attr`: this’s value.
	 * - `CharacterData`: this’s data.
	 * - _Otherwise_: Null.
	 *
	 * @implements DOM API: `Node`
	 * @see https://dom.spec.whatwg.org/#dom-node-nodevalue
	 */
	get nodeValue(): string | null {
		return null;
	}

	/**
	 * The `Document` that this node belongs to.
	 *
	 * @deprecated
	 * @implements DOM API: `Node`
	 * @see https://dom.spec.whatwg.org/#ref-for-dom-node-ownerdocument%E2%91%A0
	 */
	get ownerDocument(): any {
		return this.#ownerDocument;
	}

	/**
	 * The owning `MLDocument` instance with proper generic types,
	 * providing type-safe access to the document without the `any` type
	 * used by the DOM-compatible `ownerDocument`.
	 *
	 * @implements `@markuplint/ml-core` API: `MLNode`
	 */
	get ownerMLDocument(): MLDocument<T, O> {
		return this.#ownerDocument;
	}

	/**
	 * The parent element.
	 *
	 * @implements DOM API: `Node`
	 * @see https://dom.spec.whatwg.org/#ref-for-dom-node-parentelement%E2%91%A0
	 */
	get parentElement(): MLElement<T, O> | null {
		let parent = this.parentNode;
		while (parent) {
			if (parent.is(parent.ELEMENT_NODE)) {
				return parent;
			}
			parent = parent.parentNode;
		}
		return null;
	}

	/**
	 * The parent element in the tree of this node, which is what the DOM calls `parentElement`: `null`
	 * for what is at the top of the content of an HTML `template` element or of a declarative shadow
	 * root, whose {@link MLNode.parentElement} is the `template` element, as the syntax tree has it.
	 * A `template` element that is in no tree has none either.
	 *
	 * The selector engine and `closest()` read it, so that `section p` does not match a `p` in the
	 * content of a `template` in a `section`. {@link MLNode.parentElement} does not stop at that
	 * boundary because the content model of a `template` element is validated against what is in it.
	 *
	 * `getTreeParentElement` of `@markuplint/ml-spec`, which cannot use this getter, derives the same
	 * answer from `getRootNode()` for the algorithms of that package: a change of the boundary here
	 * belongs to it too.
	 *
	 * @implements `@markuplint/ml-core` API: `MLNode`
	 */
	get treeParentElement(): MLElement<T, O> | null {
		const parent = this.parentElement;
		if (!parent || parent.isHTMLTemplateElement) {
			return null;
		}
		if (this.is(this.ELEMENT_NODE) && this.isInNoTree) {
			return null;
		}
		return parent;
	}

	/**
	 * The parent node that may be `Element`, `Document`, `DocumentFragment`, and `null`.
	 *
	 * A block of a template language is walked through (`MLBlock#isTransparent`): a node in a block
	 * has the node that contains the block as its parent. A node at the top of a fragment document
	 * has none.
	 *
	 * ## HTML:
	 *
	 * ```html
	 * <html> // => #document
	 *   <body></body> // => <html>
	 * </html>
	 * ```
	 *
	 * ---
	 *
	 * ```html
	 * <div> // => null
	 *   <span></span> // => <div>
	 * </div>
	 * ```
	 *
	 * ## JSX:
	 *
	 * ```jsx
	 * <> // => null
	 *   <div> // => <>
	 *     {items.map(item => {
	 *       return (
	 *         <span /> // => <div>
	 *       )
	 *     })}
	 *   </div>
	 * </>
	 * ```
	 *
	 * ## Pug
	 *
	 * ```jade
	 * //- null
	 * div
	 *   //- <div>
	 *   if foo
	 *     //- <div>
	 *     span
	 * ```
	 *
	 * @implements DOM API: `Node`
	 * @see https://dom.spec.whatwg.org/#ref-for-dom-node-parentnode%E2%91%A0
	 */
	get parentNode(): MLDocument<any, any> | MLDocumentFragment<any, any> | MLElement<T, O> | null {
		const parentNode = this.syntacticalParentNode;
		if (!parentNode) {
			return null;
		}
		if (parentNode.is(parentNode.MARKUPLINT_PREPROCESSOR_BLOCK)) {
			if (parentNode.isTransparent) {
				return parentNode.parentNode;
			}
			return null;
		}
		if (parentNode.is(parentNode.ELEMENT_NODE) || parentNode.is(parentNode.DOCUMENT_FRAGMENT_NODE)) {
			return parentNode;
		}
		if (parentNode.is(parentNode.DOCUMENT_NODE) && parentNode.isFragment) {
			return null;
		}
		return parentNode;
	}

	/**
	 * The previous node in the syntactical sibling list which, unlike
	 * `previousSibling`, includes `MLBlock` nodes (AST-level traversal).
	 *
	 * @implements `@markuplint/ml-core` API: `MLNode`
	 */
	get prevNode(): MLNode<T, O> | null {
		const siblings = [...(this.syntacticalParentNode?.childNodes ?? this.#ownerDocument.nodeList)];
		const index = siblings.findIndex(node => node.uuid === this.uuid);
		return siblings[index - 1] ?? null;
	}

	/**
	 * The previous node in the document-order `nodeList`.
	 * Omitted (ghost) elements are skipped because they have no source tokens;
	 * including them would break offset chains used for indentation analysis
	 * and source reconstruction.
	 *
	 * @implements `@markuplint/ml-core` API: `MLNode`
	 */
	get prevToken(): MLNode<T, O> | null {
		if (this.#prevToken !== undefined) {
			return this.#prevToken;
		}

		let index = -1;
		for (let i = 0; i < this.ownerMLDocument.nodeList.length; i++) {
			const node = this.ownerMLDocument.nodeList[i];
			if (!node) {
				continue;
			}

			if (node.is(this.ELEMENT_NODE) && node.isOmitted) {
				continue;
			}

			if (node.uuid === this.uuid) {
				index = i;
				break;
			}
		}
		if (index === -1) {
			this.#prevToken = null;
			return this.#prevToken;
		}
		this.#prevToken = this.ownerMLDocument.nodeList[index - 1] ?? null;
		return this.#prevToken ?? null;
	}

	/**
	 * The previous sibling of an object is its first preceding sibling or null if it has no preceding sibling.
	 *
	 * @implements DOM API: `Node`
	 * @see https://dom.spec.whatwg.org/#concept-tree-previous-sibling
	 */
	get previousSibling(): MLChildNode<T, O> | null {
		let prevNode = this.prevNode;
		while (prevNode) {
			if (
				isChildNode(prevNode) &&
				((this.parentNode === null && prevNode.parentNode === null) ||
					this.parentNode?.uuid === prevNode.parentNode?.uuid)
			) {
				return prevNode;
			}
			prevNode = prevNode.prevNode;
		}
		return null;
	}

	/**
	 * @implements `@markuplint/ml-core` API: `MLNode`
	 */
	get rule(): RuleInfo<T, O> {
		if (!this.ownerMLDocument.currentRule) {
			throw new Error('Invalid call: Some rule evaluations may not be running asynchronously.');
		}
		const name = this.ownerMLDocument.currentRule.name;
		const settingRule = this.rules[name];

		const rule = this.ownerMLDocument.currentRule.optimizeOption(settingRule as Rule<T, O>);

		// eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
		if (!rule) {
			throw new Error(
				`Rule data "${name}" doesn't exist in rules ([${Object.keys(this.rules).map(
					name => `"${name}"`,
				)}]) of ${this.nodeName}("${this.raw}")`,
			);
		}

		return rule;
	}

	/**
	 * Returns a syntactical parent node
	 *
	 * ## HTML:
	 *
	 * ```html
	 * <html> // => #document
	 *   <body></body> // => <html>
	 * </html>
	 * ```
	 *
	 * ## JSX:
	 *
	 * ```jsx
	 * <> // => #document
	 *   <div> // => <>
	 *     {items.map(item => {
	 *       return (
	 *         <span /> // => #ml-block
	 *       )
	 *     })}
	 *   </div>
	 * </>
	 * ```
	 *
	 * ## Pug
	 *
	 * ```jade
	 * //- #document
	 * div
	 *   //- <div>
	 *   if foo
	 *     //- #ml-block
	 *     span
	 * ```
	 *
	 * @implements `@markuplint/ml-core` API: `MLNode`
	 */
	get syntacticalParentNode():
		| MLDocument<any, any>
		| MLDocumentFragment<any, any>
		| MLElement<T, O>
		| MLBlock<T, O>
		| null {
		if (this._astToken.type === 'attr' || this._astToken.type === 'spread') {
			return null;
		}
		if (!this._astToken.parentNodeUuid) {
			return this.ownerMLDocument;
		}
		return this.#nodeStore.getNodeByUuid<T, O>(this._astToken.parentNodeUuid) as
			| MLDocument<any, any>
			| MLDocumentFragment<any, any>
			| MLElement<T, O>
			| MLBlock<T, O>;
	}

	/**
	 * Return the text content.
	 *
	 * - If the node is a `Comment`, or `Text`, textContent returns, or sets, the text inside the node, i.e., the Node.nodeValue.
	 * - For other node types, textContent returns the concatenation of the textContent of every child node, excluding comments and processing instructions. (This is an empty string if the node has no children.)
	 *
	 * @implements DOM API: `Node`
	 * @see https://dom.spec.whatwg.org/#dom-node-textcontent
	 */
	get textContent(): string | null {
		return null;
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `EventTarget`
	 * @see https://dom.spec.whatwg.org/#ref-for-dom-eventtarget-addeventlistener%E2%91%A2
	 */
	addEventListener(
		type: string,
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		callback?: EventListenerOrEventListenerObject | null,
		options: AddEventListenerOptions | boolean = {},
	): void {
		throw new UnexpectedCallError('Not supported "addEventListener" method');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Node`
	 * @see https://dom.spec.whatwg.org/#dom-node-appendchild
	 */
	appendChild<T extends Node>(node: T): T {
		throw new UnexpectedCallError('Not supported "appendChild" method');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Node`
	 * @see https://dom.spec.whatwg.org/#ref-for-dom-node-clonenode%E2%91%A0
	 */
	cloneNode(deep?: boolean): Node {
		throw new UnexpectedCallError('Not supported "appendChild" method');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Node`
	 * @see https://dom.spec.whatwg.org/#ref-for-dom-node-comparedocumentposition%E2%91%A0
	 */
	compareDocumentPosition(
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		other: Node,
	): number {
		throw new UnexpectedCallError('Not supported "compareDocumentPosition" method');
	}

	/**
	 * Returns an array of NodeLists representing the conditional child nodes of the current node.
	 * Conditional child nodes are nodes that are nested within
	 * **preprocessor blocks** such as `if` or `switch`, within a `template` that Vue renders away for
	 * `v-if`, `v-else-if` or `v-else`, and the elements that carry one of those directives themselves.
	 * Each NodeList represents a branch of conditional child nodes.
	 *
	 * The nodes of a branch are one choice: a branch of `<dt>` and `<dd>` is both of them or none.
	 * A chain is `if` followed by any number of `if:elseif` and `if:else`; the next `if` starts another,
	 * even when the `end` of a block or whitespace is between.
	 *
	 * Note: NodeList doesn't include whitespace nodes.
	 *
	 * For `if`/`switch` groups that do not end with `else` or `default`, a `null` sentinel is appended
	 * to each branch group to represent the case where no branch renders at all, so that
	 * content-model rules also validate the "empty branch" pattern
	 * (`branchesToPatterns` filters the `null` out of the generated patterns).
	 * `each` blocks intentionally do not start a conditional mode: their content
	 * is flattened as always-present rather than treated as an alternative
	 * branch, even though a loop may render zero times.
	 *
	 * @returns An array of NodeLists representing the conditional child nodes.
	 *
	 * @experemental
	 * @implements `@markuplint/ml-core` API: `MLNode`
	 */
	conditionalChildNodes(): NodeListOf<MLChildNode<T, O>>[] {
		this.#conditionalChildNodes ??= this.#childNodePatterns(true);
		return this.#conditionalChildNodes;
	}

	/**
	 * Returns an array of NodeLists representing the child nodes in each way that the elements of a chain of
	 * `v-if`, `v-else-if` and `v-else` can be rendered, a chain being a choice of one of its elements.
	 * Unlike {@link MLNode.conditionalChildNodes} it expands nothing else: a preprocessor block and a
	 * `template` that is rendered away stay nodes, and there is no pattern in which none of a chain is rendered,
	 * so that an element without `v-else` is as written.
	 *
	 * What reads the children as the markup writes them takes it, since the elements of a chain are not
	 * siblings that are rendered together. Whitespace text nodes stay in the patterns, which
	 * {@link MLNode.conditionalChildNodes} drops: a caller that ignores them filters them itself. A chain of
	 * more patterns than a limit is read as written (see `MAX_ALTERNATIVE_PATTERNS`).
	 *
	 * @returns An array of NodeLists, one for each combination of the elements of the chains.
	 *
	 * @experimental
	 * @implements `@markuplint/ml-core` API: `MLNode`
	 * @see https://vuejs.org/guide/essentials/conditional.html#v-else
	 */
	alternativeChildNodes(): NodeListOf<MLChildNode<T, O>>[] {
		if (this.#alternativeChildNodes === undefined) {
			const childNodes = this.childNodes;
			// Most elements have no chain: their children are the one pattern, as written
			const hasChain = [...childNodes].some(
				child =>
					child.is(child.ELEMENT_NODE) &&
					!child.isRenderedAway &&
					['if', 'if:elseif', 'if:else'].includes(child.blockBehavior?.type ?? ''),
			);
			this.#alternativeChildNodes = hasChain ? this.#childNodePatterns(false) : [childNodes];
		}
		return this.#alternativeChildNodes;
	}

	/**
	 * @param expandBlocks - Whether to expand the preprocessor blocks and the templates that are rendered
	 *   away into their branches, and to add the choice of none to a chain
	 */
	#childNodePatterns(expandBlocks: boolean): NodeListOf<MLChildNode<T, O>>[] {
		type Branch = { readonly nodes: readonly MLChildNode<T, O>[] };

		const branches: (Branch | (Branch | null)[])[] = [];
		let mode: 'if' | 'switch' | null = null;
		let openConditional = false;
		// What the open group is made of: whitespace between elements does not end it, as `v-else` may be on the next line
		let openIsElements = false;
		// The kind of the open group: `if` (with `else-if` and `else`), `switch`, `await` or `each`
		let family = '';
		// A chain that ends with `else` or `default` renders one of its branches
		let exhaustive = false;
		let alternatives: (Branch | null)[] = [];
		// Whitespace and comments between the elements of a chain are not rendered, and are nodes if the chain ends before them
		const pendingText: MLChildNode<T, O>[] = [];
		// The elements of the open group, to read as written when the chains make too many patterns
		const openMembers: MLChildNode<T, O>[] = [];
		// The number of patterns that the chains so far make: it grows by the product of their sizes
		let combinations = 1;

		const close = () => {
			if (!openConditional) {
				return;
			}
			if (expandBlocks && !exhaustive && (mode === 'if' || mode === 'switch')) {
				alternatives.push(null);
			}
			// A branch that renders nothing is the choice of none, which one `null` stands for
			const choices = alternatives.filter(
				(branch, index) => branch !== null || alternatives.indexOf(null) === index,
			);
			if (openIsElements && combinations * choices.length > MAX_ALTERNATIVE_PATTERNS) {
				// Past the limit the elements of a chain are read as written: all of them are rendered
				branches.push(...openMembers.map(member => ({ nodes: [member] })));
			} else {
				combinations *= Math.max(choices.length, 1);
				branches.push(choices);
			}
			branches.push(...pendingText.map(text => ({ nodes: [text] })));
			pendingText.length = 0;
			openMembers.length = 0;
			mode = null;
			exhaustive = false;
			openConditional = false;
			openIsElements = false;
			family = '';
			alternatives = [];
		};

		for (const child of this.childNodes) {
			const behaviorType =
				child.is(child.ELEMENT_NODE) || child.is(child.MARKUPLINT_PREPROCESSOR_BLOCK)
					? child.blockBehavior?.type
					: undefined;
			const isExpandable =
				expandBlocks &&
				(child.is(child.MARKUPLINT_PREPROCESSOR_BLOCK) ||
					(!!behaviorType && child.is(child.ELEMENT_NODE) && child.isRenderedAway));
			const isChained =
				!isExpandable &&
				(behaviorType === 'if' || behaviorType === 'if:elseif' || behaviorType === 'if:else') &&
				child.is(child.ELEMENT_NODE) &&
				!child.isRenderedAway;

			if (isExpandable || isChained) {
				const nextFamily = behaviorType?.split(':')[0] ?? '';
				// A block of another kind is another group, as is the next `if`: the `end` of a block is not a node
				if (behaviorType === 'if' || (openConditional && nextFamily !== family)) {
					close();
				}
				switch (behaviorType) {
					case 'if':
					case 'if:elseif': {
						mode = 'if';
						break;
					}
					case 'switch:case': {
						mode = 'switch';
						break;
					}

					case 'if:else': {
						mode = 'if';
						exhaustive = true;
						break;
					}
					case 'switch:default': {
						mode = 'switch';
						exhaustive = true;
						break;
					}

					/* No default mode */
					case 'each':
					case 'each:empty':
					case 'await':
					case 'await:catch':
					case 'await:then': {
						break;
					}

					default: {
						continue;
					}
				}

				family = nextFamily;
				openIsElements = child.is(child.ELEMENT_NODE);
				pendingText.length = 0;
				openMembers.push(child);
				if (isChained) {
					alternatives.push({ nodes: [child] });
				} else {
					// Each way that the branch is rendered is one choice, whatever the number of nodes in it
					alternatives.push(
						...child
							.conditionalChildNodes()
							.map(nodes => (nodes.length > 0 ? { nodes: [...nodes] } : null)),
					);
				}

				openConditional = true;
				continue;
			}

			// A comment between the elements of a chain is not rendered either, and is a node if the chain ends before it
			if (openConditional && openIsElements && child.is(child.COMMENT_NODE)) {
				pendingText.push(child);
				continue;
			}

			if (child.is(child.TEXT_NODE) && child.isWhitespace()) {
				if (expandBlocks) {
					// It is dropped. It ends a group of blocks, but not a chain of elements: `v-else` may be on the next line
					if (!openIsElements) {
						close();
					}
					continue;
				}
				if (openConditional) {
					pendingText.push(child);
				} else {
					branches.push({ nodes: [child] });
				}
				continue;
			}

			close();
			branches.push({ nodes: [child] });
		}

		close();

		return branchesToPatterns(branches).map(pattern => toNodeList(pattern.flatMap(branch => branch.nodes)));
	}

	/**
	 * Returns true if other is an inclusive descendant of node; otherwise false.
	 *
	 * What an HTML `template` element holds is its `content`, a tree of its own, so the element does
	 * not contain it, and an element does not contain the content of a `template` under it, so
	 * `contains()` asked of what is outside a template about what is inside it is `false` as well.
	 * That differs from {@link MLNode.parentElement}, which stays the one of the syntax
	 * tree (the `template` element) because the content model of a `template` element is validated
	 * against what the syntax tree puts in it.
	 *
	 * @implements DOM API: `Node`
	 * @see https://dom.spec.whatwg.org/#ref-for-dom-node-contains%E2%91%A0
	 */
	contains(
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		other: MLNode<T, O> | null,
	) {
		if (this.is(this.ELEMENT_NODE) && this.isHTMLTemplateElement) {
			return false;
		}
		for (const childNode of this.childNodes) {
			if (other?.uuid === childNode.uuid || childNode.contains(other)) {
				return true;
			}
		}
		return false;
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `EventTarget`
	 * @see https://dom.spec.whatwg.org/#ref-for-dom-eventtarget-dispatchevent%E2%91%A2
	 */
	dispatchEvent(
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		event: Event,
	): boolean {
		throw new UnexpectedCallError('Not supported "dispatchEvent" method');
	}

	/**
	 * Finds subsequent nodes that match the given selector, in the tree of this node: what follows in
	 * the markup but is in another tree (the content of an HTML `template` element) is not subsequent
	 * to it.
	 *
	 * @implements `@markuplint/ml-core` API: `MLNode`
	 * @param selector - Optional selector to filter the nodes.
	 * @returns An array of matched child nodes.
	 */
	findSubsequentNodes(selector?: string): MLChildNode<T, O>[] {
		const matched: MLChildNode<T, O>[] = [];
		const root = this.getRootNode();
		for (const node of this.ownerMLDocument.nodeList) {
			if (node.endOffset <= this.endOffset) {
				continue;
			}

			if (this.contains(node)) {
				continue;
			}

			if (node.getRootNode() !== root) {
				continue;
			}

			if (selector) {
				if (node.is(node.ELEMENT_NODE) && node.matches(selector)) {
					matched.push(node);
				}
				continue;
			}

			if (isChildNode(node)) {
				matched.push(node);
			}
		}
		return matched;
	}

	/**
	 *
	 * @implements DOM API: `MLNode`
	 */
	getPureChildNodes(): NodeListOf<MLChildNode<T, O>> {
		if (this.#pureChildNodesCache != null) {
			return this.#pureChildNodesCache;
		}
		if (this.is(this.DOCUMENT_NODE)) {
			const childNodes: MLChildNode<T, O>[] = [];
			for (const node of this.nodeList) {
				if (isChildNode(node) && (node.parentNode === this || node.parentNode === null)) {
					childNodes.push(node);
				}
			}

			// Cache
			this.#pureChildNodesCache = toNodeList(childNodes);
			return this.#pureChildNodesCache;
		}
		if (
			this.is(this.DOCUMENT_FRAGMENT_NODE) ||
			this.is(this.ELEMENT_NODE) ||
			this.is(this.MARKUPLINT_PREPROCESSOR_BLOCK)
		) {
			const astChildren: Exclude<MLASTChildNode, MLASTElementCloseTag | MLASTInvalid>[] =
				// @ts-ignore
				this._astToken?.childNodes?.filter(node => {
					if (node.type === 'endtag' || node.type === 'invalid') {
						return null;
					}
					return node;
				}) ?? [];
			const childNodes = astChildren
				.map(node => this.#nodeStore.getNode<typeof node, T, O>(node))
				.filter(node => isChildNode(node));

			// Cache
			this.#pureChildNodesCache = toNodeList(childNodes);
			return this.#pureChildNodesCache;
		}
		// Cache
		this.#pureChildNodesCache = toNodeList([]);
		return this.#pureChildNodesCache;
	}

	/**
	 * The root of the tree of this node: the document, the content of the nearest HTML `template`
	 * element above it (a declarative shadow root when one is attached to the parent of the `template`),
	 * or this node itself for a document fragment, and for a `template` element that is in no tree.
	 * The syntax tree is followed through what a template engine renders away, so a block of a
	 * template language between the `template` element and this node does not hide the `template`.
	 *
	 * With `composed`, a shadow root is followed to its host.
	 *
	 * @param options - `composed` follows a shadow root to its host
	 * @returns The root of the tree
	 * @implements DOM API: `Node`
	 * @see https://dom.spec.whatwg.org/#ref-for-dom-node-getrootnode%E2%91%A0
	 */
	getRootNode(
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		options?: GetRootNodeOptions,
	): MLNode<T, O> {
		const root = this.#getTreeRoot();
		if (options?.composed && root.is(root.DOCUMENT_FRAGMENT_NODE) && 'host' in root) {
			return (root.host as MLNode<T, O>).getRootNode(options);
		}
		return root;
	}

	#treeRoot: MLNode<T, O> | undefined;

	#getTreeRoot(): MLNode<T, O> {
		if (this.#treeRoot) {
			return this.#treeRoot;
		}
		this.#treeRoot = this.#findTreeRoot();
		return this.#treeRoot;
	}

	#findTreeRoot(): MLNode<T, O> {
		if (this.is(this.DOCUMENT_NODE) || this.is(this.DOCUMENT_FRAGMENT_NODE)) {
			return this;
		}
		if (this.is(this.ELEMENT_NODE) && this.isInNoTree) {
			return this;
		}
		let ancestor = this.syntacticalParentNode;
		while (ancestor && !ancestor.is(ancestor.DOCUMENT_NODE)) {
			if (ancestor.is(ancestor.ELEMENT_NODE) && ancestor.isHTMLTemplateElement) {
				return ancestor.content ?? this.#ownerDocument;
			}
			ancestor = ancestor.syntacticalParentNode;
		}
		return this.#ownerDocument;
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Node`
	 * @see https://dom.spec.whatwg.org/#ref-for-dom-node-haschildnodes%E2%91%A0
	 */
	hasChildNodes(): boolean {
		throw new UnexpectedCallError('Not supported "hasChildNodes" method');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Node`
	 * @see https://dom.spec.whatwg.org/#dom-node-insertbefore
	 */
	insertBefore<T extends Node>(
		node: T,
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		child: Node | null,
	): T {
		throw new UnexpectedCallError('Not supported "insertBefore" method');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Node`
	 */
	moveBefore(
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		node: Node,
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		child: Node | null,
	): Node {
		throw new UnexpectedCallError('Not supported "moveBefore" method');
	}

	/**
	 * @implements `@markuplint/ml-core` API: `MLNode`
	 */
	is<NType extends NodeType>(nodeType: NType): this is NodeTypeOf<NType, T, O> {
		return this.nodeType === nodeType;
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Node`
	 * @see https://dom.spec.whatwg.org/#dom-node-isdefaultnamespace
	 */
	isDefaultNamespace(namespace: string | null): boolean {
		throw new UnexpectedCallError('Not supported "isDefaultNamespace" method');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Node`
	 * @see https://dom.spec.whatwg.org/#ref-for-dom-node-isequalnode%E2%91%A0
	 */
	isEqualNode(
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		otherNode: Node | null,
	): boolean {
		throw new UnexpectedCallError('Not supported "isEqualNode" method');
	}

	/**
	 * Whether the document of this node is a fragment of a document (a partial, a component) and
	 * not a whole one. The parser of the document decides it (`MLDocument#isFragment`).
	 *
	 * @implements `@markuplint/ml-core` API: `MLNode`
	 */
	isInFragmentDocument(): boolean {
		return this.ownerMLDocument.isFragment;
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Node`
	 * @see https://dom.spec.whatwg.org/#dom-node-issamenode
	 */
	isSameNode(
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		otherNode: Node | null,
	): boolean {
		throw new UnexpectedCallError('Not supported "isSameNode" method');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Node`
	 * @see https://dom.spec.whatwg.org/#dom-node-lookupnamespaceuri
	 */
	lookupNamespaceURI(prefix: string | null): string | null {
		throw new UnexpectedCallError('Not supported "lookupNamespaceURI" method');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Node`
	 * @see https://dom.spec.whatwg.org/#dom-node-lookupprefix
	 */
	lookupPrefix(namespace: string | null): string | null {
		throw new UnexpectedCallError('Not supported "lookupPrefix" method');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Node`
	 * @see https://dom.spec.whatwg.org/#ref-for-dom-node-normalize%E2%91%A0
	 */
	normalize(): void {
		throw new UnexpectedCallError('Not supported "normalize" method');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Node`
	 * @see https://dom.spec.whatwg.org/#dom-node-removechild
	 */
	removeChild<T extends Node>(child: T): T {
		throw new UnexpectedCallError('Not supported "removeChild" method');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `EventTarget`
	 * @see https://dom.spec.whatwg.org/#ref-for-dom-eventtarget-removeeventlistener%E2%91%A1
	 */
	removeEventListener(
		type: string,
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		callback?: EventListenerOrEventListenerObject | null,
		options: EventListenerOptions | boolean = {},
	): void {
		throw new UnexpectedCallError('Not supported "removeEventListener" method');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Node`
	 * @see https://dom.spec.whatwg.org/#dom-node-replacechild
	 */
	replaceChild<T extends Node>(
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		node: Node,
		child: T,
	): T {
		throw new UnexpectedCallError('Not supported "removeChild" method');
	}

	/**
	 * @implements `@markuplint/ml-core` API: `MLNode`
	 */
	resetChildren(
		// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
		childNodes?: NodeListOf<MLChildNode<T, O>>,
	) {
		this.#pureChildNodesCache = childNodes ?? this.#pureChildNodesCache;
	}
}
