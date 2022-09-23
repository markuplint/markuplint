import type { MLRule } from '../../ml-rule';
import type Ruleset from '../../ruleset';
import type { Walker } from '../helper/walkers';
import type { MLToken } from '../token/token';
import type { MLAttr } from './attr';
import type { MLComment } from './comment';
import type { MLDocumentType } from './document-type';
import type { MLElement } from './element';
import type { MLNode } from './node';
import type { MLText } from './text';
import type { DocumentNodeType } from './types';
import type { MLASTDocument, MLASTNode } from '@markuplint/ml-ast';
import type { Pretender, RuleConfigValue } from '@markuplint/ml-config';
import type { ExtendedSpec, MLMLSpec } from '@markuplint/ml-spec';

import { exchangeValueOnRule, mergeRule } from '@markuplint/ml-config';
import { schemaToSpec } from '@markuplint/ml-spec';
import { matchSelector } from '@markuplint/selector';

import { log as coreLog } from '../../debug';
import { createNode } from '../helper/create-node';
import { nodeListToDebugMaps } from '../helper/debug';
import { sequentialWalker, syncWalk } from '../helper/walkers';

import { nodeListToHTMLCollection } from './node-list';
import { MLParentNode } from './parent-node';
import { RuleMapper } from './rule-mapper';
import UnexpectedCallError from './unexpected-call-error';

const log = coreLog.extend('ml-dom');
const docLog = log.extend('document');
const ruleLog = docLog.extend('rule');

export class MLDocument<T extends RuleConfigValue, O = null> extends MLParentNode<T, O> implements Document {
	/**
	 *
	 */
	currentRule: MLRule<T, O> | null = null;

	/**
	 *
	 */
	readonly endTag: 'xml' | 'omittable' | 'never';

	/**
	 *
	 */
	readonly #filename?: string;

	/**
	 *
	 */
	readonly isFragment: boolean;

	/**
	 * An array of markuplint DOM nodes
	 */
	readonly nodeList: ReadonlyArray<MLNode<T, O>>;

	readonly ontouchcancel?: ((this: GlobalEventHandlers, ev: TouchEvent) => any) | null | undefined;

	readonly ontouchend?: ((this: GlobalEventHandlers, ev: TouchEvent) => any) | null | undefined;

	readonly ontouchmove?: ((this: GlobalEventHandlers, ev: TouchEvent) => any) | null | undefined;

	readonly ontouchstart?: ((this: GlobalEventHandlers, ev: TouchEvent) => any) | null | undefined;

	/**
	 *
	 */
	readonly specs: Readonly<MLMLSpec>;

	#tokenList: ReadonlyArray<MLToken> | null = null;

	/**
	 *
	 * @param ast node list of markuplint AST
	 * @param ruleset ruleset object
	 */
	constructor(
		ast: MLASTDocument,
		ruleset: Ruleset,
		schemas: readonly [MLMLSpec, ...ExtendedSpec[]],
		options?: {
			filename?: string;
			endTag?: 'xml' | 'omittable' | 'never';
			pretenders?: Pretender[];
		},
	) {
		// @ts-ignore
		super(ast, null);

		this.isFragment = ast.isFragment;
		this.specs = schemaToSpec(schemas);
		this.endTag = options?.endTag ?? 'omittable';
		this.#filename = options?.filename;

		// console.log(ast.nodeList.map((n, i) => `${i}: ${n.uuid} "${n.raw.trim()}"(${n.type})`));
		this.nodeList = Object.freeze(
			ast.nodeList
				.map(astNode => {
					if (astNode.type === 'endtag') {
						return;
					}
					return createNode<MLASTNode, T, O>(astNode, this);
				})
				.filter((n): n is MLNode<T, O> => !!n),
		);

		this._pretending(options?.pretenders);
		this._ruleMapping(ruleset);
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get URL(): string {
		throw new UnexpectedCallError('Not supported "URL" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get activeElement(): Element | null {
		throw new UnexpectedCallError('Not supported "activeElement" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get adoptedStyleSheets(): CSSStyleSheet[] {
		throw new UnexpectedCallError('Not supported "adoptedStyleSheets" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get alinkColor(): string {
		throw new UnexpectedCallError('Not supported "alinkColor" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get all(): HTMLAllCollection {
		throw new UnexpectedCallError('Not supported "all" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get anchors(): HTMLCollectionOf<HTMLAnchorElement> {
		throw new UnexpectedCallError('Not supported "anchors" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get applets(): HTMLCollection {
		throw new UnexpectedCallError('Not supported "applets" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get bgColor(): string {
		throw new UnexpectedCallError('Not supported "bgColor" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get body(): HTMLElement {
		throw new UnexpectedCallError('Not supported "body" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get characterSet(): string {
		throw new UnexpectedCallError('Not supported "characterSet" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get charset(): string {
		throw new UnexpectedCallError('Not supported "charset" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get compatMode(): string {
		throw new UnexpectedCallError('Not supported "compatMode" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get contentType(): string {
		throw new UnexpectedCallError('Not supported "contentType" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get cookie(): string {
		throw new UnexpectedCallError('Not supported "cookie" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get currentScript(): HTMLOrSVGScriptElement | null {
		throw new UnexpectedCallError('Not supported "currentScript" property');
	}

	/**
	 * Window object for calling the `getComputedStyle` and the `getPropertyValue` that
	 * are needed by **Accessible Name and Description Computation**.
	 * But it always returns the empty object.
	 * (It may improve to possible to compute the name from the `style` attribute in the future.)
	 *
	 * @implements DOM API: `Document`
	 */
	get defaultView(): any {
		return {
			getComputedStyle(_el: MLElement<T, O>) {
				return {
					getPropertyValue(_propName: string) {
						return {};
					},
				};
			},
		};
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get designMode(): string {
		throw new UnexpectedCallError('Not supported "designMode" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get dir(): string {
		throw new UnexpectedCallError('Not supported "dir" property');
	}

	/**
	 * @implements DOM API: `Document`
	 */
	get doctype(): MLDocumentType<T, O> | null {
		for (const node of this.nodeList) {
			if (node.is(node.DOCUMENT_TYPE_NODE)) {
				return node;
			}
		}
		return null;
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get documentElement(): HTMLElement {
		throw new UnexpectedCallError('Not supported "documentElement" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get documentURI(): string {
		throw new UnexpectedCallError('Not supported "documentURI" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get domain(): string {
		throw new UnexpectedCallError('Not supported "domain" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get embeds(): HTMLCollectionOf<HTMLEmbedElement> {
		throw new UnexpectedCallError('Not supported "embeds" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get fgColor(): string {
		throw new UnexpectedCallError('Not supported "fgColor" property');
	}

	/**
	 * It could be used in rule, make sure it is immutable
	 *
	 * @implements `@markuplint/ml-core` API: `MLDOMDocument`
	 */
	get filename() {
		return this.#filename;
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get fonts(): FontFaceSet {
		throw new UnexpectedCallError('Not supported "fonts" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get forms(): HTMLCollectionOf<HTMLFormElement> {
		throw new UnexpectedCallError('Not supported "forms" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get fullscreen(): boolean {
		throw new UnexpectedCallError('Not supported "fullscreen" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get fullscreenElement(): Element | null {
		throw new UnexpectedCallError('Not supported "fullscreenElement" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get fullscreenEnabled(): boolean {
		throw new UnexpectedCallError('Not supported "FullscreenEnabledURL" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get head(): HTMLHeadElement {
		throw new UnexpectedCallError('Not supported "head" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get hidden(): boolean {
		throw new UnexpectedCallError('Not supported "hidden" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get images(): HTMLCollectionOf<HTMLImageElement> {
		throw new UnexpectedCallError('Not supported "images" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get implementation(): DOMImplementation {
		throw new UnexpectedCallError('Not supported "implementation" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get inputEncoding(): string {
		throw new UnexpectedCallError('Not supported "inputEncoding" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get lastModified(): string {
		throw new UnexpectedCallError('Not supported "lastModified" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get linkColor(): string {
		throw new UnexpectedCallError('Not supported "linkColor" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get links(): HTMLCollectionOf<HTMLAnchorElement | HTMLAreaElement> {
		throw new UnexpectedCallError('Not supported "links" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get location(): Location {
		throw new UnexpectedCallError('Not supported "location" property');
	}

	/**
	 * Returns a string appropriate for the type of node as `Document`
	 *
	 * @see https://dom.spec.whatwg.org/#ref-for-document%E2%91%A8
	 */
	get nodeName() {
		return '#document' as const;
	}

	/**
	 * Returns a number appropriate for the type of `Document`
	 */
	get nodeType(): DocumentNodeType {
		return this.DOCUMENT_NODE;
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get onabort(): ((this: GlobalEventHandlers, ev: UIEvent) => any) | null {
		throw new UnexpectedCallError('Not supported "onabort" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get onanimationcancel(): ((this: GlobalEventHandlers, ev: AnimationEvent) => any) | null {
		throw new UnexpectedCallError('Not supported "onanimationcancel" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get onanimationend(): ((this: GlobalEventHandlers, ev: AnimationEvent) => any) | null {
		throw new UnexpectedCallError('Not supported "onanimationend" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get onanimationiteration(): ((this: GlobalEventHandlers, ev: AnimationEvent) => any) | null {
		throw new UnexpectedCallError('Not supported "onanimationiteration" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get onanimationstart(): ((this: GlobalEventHandlers, ev: AnimationEvent) => any) | null {
		throw new UnexpectedCallError('Not supported "onanimationstart" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get onauxclick(): ((this: GlobalEventHandlers, ev: MouseEvent) => any) | null {
		throw new UnexpectedCallError('Not supported "onauxclick" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get onblur(): ((this: GlobalEventHandlers, ev: FocusEvent) => any) | null {
		throw new UnexpectedCallError('Not supported "onblur" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get oncanplay(): ((this: GlobalEventHandlers, ev: Event) => any) | null {
		throw new UnexpectedCallError('Not supported "oncanplay" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get oncanplaythrough(): ((this: GlobalEventHandlers, ev: Event) => any) | null {
		throw new UnexpectedCallError('Not supported "oncanplaythrough" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get onchange(): ((this: GlobalEventHandlers, ev: Event) => any) | null {
		throw new UnexpectedCallError('Not supported "onchange" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get onclick(): ((this: GlobalEventHandlers, ev: MouseEvent) => any) | null {
		throw new UnexpectedCallError('Not supported "onclick" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get onclose(): ((this: GlobalEventHandlers, ev: Event) => any) | null {
		throw new UnexpectedCallError('Not supported "onclose" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get oncontextmenu(): ((this: GlobalEventHandlers, ev: MouseEvent) => any) | null {
		throw new UnexpectedCallError('Not supported "oncontextmenu" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get oncopy(): ((this: DocumentAndElementEventHandlers, ev: ClipboardEvent) => any) | null {
		throw new UnexpectedCallError('Not supported "oncopy" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get oncuechange(): ((this: GlobalEventHandlers, ev: Event) => any) | null {
		throw new UnexpectedCallError('Not supported "oncuechange" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get oncut(): ((this: DocumentAndElementEventHandlers, ev: ClipboardEvent) => any) | null {
		throw new UnexpectedCallError('Not supported "oncut" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get ondblclick(): ((this: GlobalEventHandlers, ev: MouseEvent) => any) | null {
		throw new UnexpectedCallError('Not supported "ondblclick" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get ondrag(): ((this: GlobalEventHandlers, ev: DragEvent) => any) | null {
		throw new UnexpectedCallError('Not supported "ondrag" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get ondragend(): ((this: GlobalEventHandlers, ev: DragEvent) => any) | null {
		throw new UnexpectedCallError('Not supported "ondragend" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get ondragenter(): ((this: GlobalEventHandlers, ev: DragEvent) => any) | null {
		throw new UnexpectedCallError('Not supported "ondragenter" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get ondragleave(): ((this: GlobalEventHandlers, ev: DragEvent) => any) | null {
		throw new UnexpectedCallError('Not supported "ondragleave" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get ondragover(): ((this: GlobalEventHandlers, ev: DragEvent) => any) | null {
		throw new UnexpectedCallError('Not supported "ondragover" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get ondragstart(): ((this: GlobalEventHandlers, ev: DragEvent) => any) | null {
		throw new UnexpectedCallError('Not supported "ondragstart" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get ondrop(): ((this: GlobalEventHandlers, ev: DragEvent) => any) | null {
		throw new UnexpectedCallError('Not supported "ondrop" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get ondurationchange(): ((this: GlobalEventHandlers, ev: Event) => any) | null {
		throw new UnexpectedCallError('Not supported "ondurationchange" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get onemptied(): ((this: GlobalEventHandlers, ev: Event) => any) | null {
		throw new UnexpectedCallError('Not supported "onemptied" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get onended(): ((this: GlobalEventHandlers, ev: Event) => any) | null {
		throw new UnexpectedCallError('Not supported "onended" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get onerror(): OnErrorEventHandler {
		throw new UnexpectedCallError('Not supported "onerror" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get onfocus(): ((this: GlobalEventHandlers, ev: FocusEvent) => any) | null {
		throw new UnexpectedCallError('Not supported "onfocus" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get onformdata(): ((this: GlobalEventHandlers, ev: FormDataEvent) => any) | null {
		throw new UnexpectedCallError('Not supported "onformdata" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get onfullscreenchange(): ((this: Document, ev: Event) => any) | null {
		throw new UnexpectedCallError('Not supported "onfullscreenchange" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get onfullscreenerror(): ((this: Document, ev: Event) => any) | null {
		throw new UnexpectedCallError('Not supported "onfullscreenerror" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get ongotpointercapture(): ((this: GlobalEventHandlers, ev: PointerEvent) => any) | null {
		throw new UnexpectedCallError('Not supported "ongotpointercapture" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get oninput(): ((this: GlobalEventHandlers, ev: Event) => any) | null {
		throw new UnexpectedCallError('Not supported "oninput" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get oninvalid(): ((this: GlobalEventHandlers, ev: Event) => any) | null {
		throw new UnexpectedCallError('Not supported "oninvalid" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get onkeydown(): ((this: GlobalEventHandlers, ev: KeyboardEvent) => any) | null {
		throw new UnexpectedCallError('Not supported "onkeydown" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get onkeypress(): ((this: GlobalEventHandlers, ev: KeyboardEvent) => any) | null {
		throw new UnexpectedCallError('Not supported "onkeypress" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get onkeyup(): ((this: GlobalEventHandlers, ev: KeyboardEvent) => any) | null {
		throw new UnexpectedCallError('Not supported "onkeyup" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get onload(): ((this: GlobalEventHandlers, ev: Event) => any) | null {
		throw new UnexpectedCallError('Not supported "onload" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get onloadeddata(): ((this: GlobalEventHandlers, ev: Event) => any) | null {
		throw new UnexpectedCallError('Not supported "onloadeddata" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get onloadedmetadata(): ((this: GlobalEventHandlers, ev: Event) => any) | null {
		throw new UnexpectedCallError('Not supported "onloadedmetadata" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get onloadstart(): ((this: GlobalEventHandlers, ev: Event) => any) | null {
		throw new UnexpectedCallError('Not supported "onloadstart" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get onlostpointercapture(): ((this: GlobalEventHandlers, ev: PointerEvent) => any) | null {
		throw new UnexpectedCallError('Not supported "onlostpointercapture" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get onmousedown(): ((this: GlobalEventHandlers, ev: MouseEvent) => any) | null {
		throw new UnexpectedCallError('Not supported "onmousedown" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get onmouseenter(): ((this: GlobalEventHandlers, ev: MouseEvent) => any) | null {
		throw new UnexpectedCallError('Not supported "onmouseenter" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get onmouseleave(): ((this: GlobalEventHandlers, ev: MouseEvent) => any) | null {
		throw new UnexpectedCallError('Not supported "onmouseleave" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get onmousemove(): ((this: GlobalEventHandlers, ev: MouseEvent) => any) | null {
		throw new UnexpectedCallError('Not supported "onmousemove" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get onmouseout(): ((this: GlobalEventHandlers, ev: MouseEvent) => any) | null {
		throw new UnexpectedCallError('Not supported "onmouseout" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get onmouseover(): ((this: GlobalEventHandlers, ev: MouseEvent) => any) | null {
		throw new UnexpectedCallError('Not supported "onmouseover" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get onmouseup(): ((this: GlobalEventHandlers, ev: MouseEvent) => any) | null {
		throw new UnexpectedCallError('Not supported "onmouseup" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get onpaste(): ((this: DocumentAndElementEventHandlers, ev: ClipboardEvent) => any) | null {
		throw new UnexpectedCallError('Not supported "onpaste" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get onpause(): ((this: GlobalEventHandlers, ev: Event) => any) | null {
		throw new UnexpectedCallError('Not supported "onpause" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get onplay(): ((this: GlobalEventHandlers, ev: Event) => any) | null {
		throw new UnexpectedCallError('Not supported "onplay" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get onplaying(): ((this: GlobalEventHandlers, ev: Event) => any) | null {
		throw new UnexpectedCallError('Not supported "onplaying" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get onpointercancel(): ((this: GlobalEventHandlers, ev: PointerEvent) => any) | null {
		throw new UnexpectedCallError('Not supported "onpointercancel" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get onpointerdown(): ((this: GlobalEventHandlers, ev: PointerEvent) => any) | null {
		throw new UnexpectedCallError('Not supported "onpointerdown" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get onpointerenter(): ((this: GlobalEventHandlers, ev: PointerEvent) => any) | null {
		throw new UnexpectedCallError('Not supported "onpointerenter" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get onpointerleave(): ((this: GlobalEventHandlers, ev: PointerEvent) => any) | null {
		throw new UnexpectedCallError('Not supported "onpointerleave" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get onpointerlockchange(): ((this: Document, ev: Event) => any) | null {
		throw new UnexpectedCallError('Not supported "onpointerlockchange" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get onpointerlockerror(): ((this: Document, ev: Event) => any) | null {
		throw new UnexpectedCallError('Not supported "onpointerlockerror" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get onpointermove(): ((this: GlobalEventHandlers, ev: PointerEvent) => any) | null {
		throw new UnexpectedCallError('Not supported "onpointermove" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get onpointerout(): ((this: GlobalEventHandlers, ev: PointerEvent) => any) | null {
		throw new UnexpectedCallError('Not supported "onpointerout" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get onpointerover(): ((this: GlobalEventHandlers, ev: PointerEvent) => any) | null {
		throw new UnexpectedCallError('Not supported "onpointerover" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get onpointerup(): ((this: GlobalEventHandlers, ev: PointerEvent) => any) | null {
		throw new UnexpectedCallError('Not supported "onpointerup" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get onprogress(): ((this: GlobalEventHandlers, ev: ProgressEvent<EventTarget>) => any) | null {
		throw new UnexpectedCallError('Not supported "onprogress" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get onratechange(): ((this: GlobalEventHandlers, ev: Event) => any) | null {
		throw new UnexpectedCallError('Not supported "onratechange" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get onreadystatechange(): ((this: Document, ev: Event) => any) | null {
		throw new UnexpectedCallError('Not supported "onreadystatechange" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get onreset(): ((this: GlobalEventHandlers, ev: Event) => any) | null {
		throw new UnexpectedCallError('Not supported "onreset" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get onresize(): ((this: GlobalEventHandlers, ev: UIEvent) => any) | null {
		throw new UnexpectedCallError('Not supported "onresize" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get onscroll(): ((this: GlobalEventHandlers, ev: Event) => any) | null {
		throw new UnexpectedCallError('Not supported "onscroll" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get onsecuritypolicyviolation(): ((this: GlobalEventHandlers, ev: SecurityPolicyViolationEvent) => any) | null {
		throw new UnexpectedCallError('Not supported "onsecuritypolicyviolation" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get onseeked(): ((this: GlobalEventHandlers, ev: Event) => any) | null {
		throw new UnexpectedCallError('Not supported "onseeked" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get onseeking(): ((this: GlobalEventHandlers, ev: Event) => any) | null {
		throw new UnexpectedCallError('Not supported "onseeking" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get onselect(): ((this: GlobalEventHandlers, ev: Event) => any) | null {
		throw new UnexpectedCallError('Not supported "onselect" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get onselectionchange(): ((this: GlobalEventHandlers, ev: Event) => any) | null {
		throw new UnexpectedCallError('Not supported "onselectionchange" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get onselectstart(): ((this: GlobalEventHandlers, ev: Event) => any) | null {
		throw new UnexpectedCallError('Not supported "onselectstart" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get onslotchange(): ((this: GlobalEventHandlers, ev: Event) => any) | null {
		throw new UnexpectedCallError('Not supported "onslotchange" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get onstalled(): ((this: GlobalEventHandlers, ev: Event) => any) | null {
		throw new UnexpectedCallError('Not supported "onstalled" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get onsubmit(): ((this: GlobalEventHandlers, ev: SubmitEvent) => any) | null {
		throw new UnexpectedCallError('Not supported "onsubmit" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get onsuspend(): ((this: GlobalEventHandlers, ev: Event) => any) | null {
		throw new UnexpectedCallError('Not supported "onsuspend" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get ontimeupdate(): ((this: GlobalEventHandlers, ev: Event) => any) | null {
		throw new UnexpectedCallError('Not supported "ontimeupdate" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get ontoggle(): ((this: GlobalEventHandlers, ev: Event) => any) | null {
		throw new UnexpectedCallError('Not supported "ontoggle" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get ontransitioncancel(): ((this: GlobalEventHandlers, ev: TransitionEvent) => any) | null {
		throw new UnexpectedCallError('Not supported "ontransitioncancel" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get ontransitionend(): ((this: GlobalEventHandlers, ev: TransitionEvent) => any) | null {
		throw new UnexpectedCallError('Not supported "ontransitionend" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get ontransitionrun(): ((this: GlobalEventHandlers, ev: TransitionEvent) => any) | null {
		throw new UnexpectedCallError('Not supported "ontransitionrun" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get ontransitionstart(): ((this: GlobalEventHandlers, ev: TransitionEvent) => any) | null {
		throw new UnexpectedCallError('Not supported "ontransitionstart" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get onvisibilitychange(): ((this: Document, ev: Event) => any) | null {
		throw new UnexpectedCallError('Not supported "onvisibilitychange" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get onvolumechange(): ((this: GlobalEventHandlers, ev: Event) => any) | null {
		throw new UnexpectedCallError('Not supported "onvolumechange" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get onwaiting(): ((this: GlobalEventHandlers, ev: Event) => any) | null {
		throw new UnexpectedCallError('Not supported "onwaiting" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get onwebkitanimationend(): ((this: GlobalEventHandlers, ev: Event) => any) | null {
		throw new UnexpectedCallError('Not supported "onwebkitanimationend" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get onwebkitanimationiteration(): ((this: GlobalEventHandlers, ev: Event) => any) | null {
		throw new UnexpectedCallError('Not supported "onwebkitanimationiteration" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get onwebkitanimationstart(): ((this: GlobalEventHandlers, ev: Event) => any) | null {
		throw new UnexpectedCallError('Not supported "onwebkitanimationstart" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get onwebkittransitionend(): ((this: GlobalEventHandlers, ev: Event) => any) | null {
		throw new UnexpectedCallError('Not supported "onwebkittransitionend" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get onwheel(): ((this: GlobalEventHandlers, ev: WheelEvent) => any) | null {
		throw new UnexpectedCallError('Not supported "onwheel" property');
	}

	get ownerDocument(): null {
		return null;
	}

	get ownerMLDocument(): MLDocument<T, O> {
		return this;
	}

	/**
	 * @implements DOM API: `Document`
	 * @see https://dom.spec.whatwg.org/#ref-for-dom-node-parentnode%E2%91%A0
	 */
	get parentNode() {
		return null;
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get pictureInPictureElement(): Element | null {
		throw new UnexpectedCallError('Not supported "pictureInPictureElement" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get pictureInPictureEnabled(): boolean {
		throw new UnexpectedCallError('Not supported "pictureInPictureEnabled" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get plugins(): HTMLCollectionOf<HTMLEmbedElement> {
		throw new UnexpectedCallError('Not supported "plugins" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get pointerLockElement(): Element | null {
		throw new UnexpectedCallError('Not supported "pointerLockElement" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get readyState(): DocumentReadyState {
		throw new UnexpectedCallError('Not supported "readyState" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get referrer(): string {
		throw new UnexpectedCallError('Not supported "referrer" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get rootElement(): SVGSVGElement | null {
		throw new UnexpectedCallError('Not supported "rootElement" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get scripts(): HTMLCollectionOf<HTMLScriptElement> {
		throw new UnexpectedCallError('Not supported "scripts" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get scrollingElement(): Element | null {
		throw new UnexpectedCallError('Not supported "scrollingElement" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get styleSheets(): StyleSheetList {
		throw new UnexpectedCallError('Not supported "styleSheets" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get timeline(): DocumentTimeline {
		throw new UnexpectedCallError('Not supported "timeline" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get title(): string {
		throw new UnexpectedCallError('Not supported "title" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get visibilityState(): DocumentVisibilityState {
		throw new UnexpectedCallError('Not supported "visibilityState" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	get vlinkColor(): string {
		throw new UnexpectedCallError('Not supported "vlinkColor" property');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	adoptNode<T extends Node>(node: T): T {
		throw new UnexpectedCallError('Not supported "adoptNode" method');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	captureEvents(): void {
		throw new UnexpectedCallError('Not supported "captureEvents" method');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	caretRangeFromPoint(x: number, y: number): Range | null {
		throw new UnexpectedCallError('Not supported "caretRangeFromPoint" method');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	clear(): void {
		throw new UnexpectedCallError('Not supported "clear" method');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	close(): void {
		throw new UnexpectedCallError('Not supported "close" method');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	createAttribute(localName: string): Attr {
		throw new UnexpectedCallError('Not supported "createAttribute" method');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	createAttributeNS(namespace: string | null, qualifiedName: string): Attr {
		throw new UnexpectedCallError('Not supported "createAttributeNS" method');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	createCDATASection(data: string): CDATASection {
		throw new UnexpectedCallError('Not supported "createCDATASection" method');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	createComment(data: string): Comment {
		throw new UnexpectedCallError('Not supported "createComment" method');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	createDocumentFragment(): DocumentFragment {
		throw new UnexpectedCallError('Not supported "createDocumentFragment" method');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	createElement(tagName: any, options?: any): any {
		throw new UnexpectedCallError('Not supported "createElement" method');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	createElementNS(namespace: any, qualifiedName: any, options?: any): any {
		throw new UnexpectedCallError('Not supported "createElementNS" method');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	createEvent(eventInterface: any): any {
		throw new UnexpectedCallError('Not supported "createEvent" method');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	createExpression(expression: string, resolver?: XPathNSResolver | null): XPathExpression {
		throw new UnexpectedCallError('Not supported "createExpression" method');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	createNSResolver(nodeResolver: Node): XPathNSResolver {
		throw new UnexpectedCallError('Not supported "createNSResolver" method');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	createNodeIterator(root: Node, whatToShow?: number, filter?: NodeFilter | null): NodeIterator {
		throw new UnexpectedCallError('Not supported "createNodeIterator" method');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	createProcessingInstruction(target: string, data: string): ProcessingInstruction {
		throw new UnexpectedCallError('Not supported "createProcessingInstruction" method');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	createRange(): Range {
		throw new UnexpectedCallError('Not supported "createRange" method');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	createTextNode(data: string): Text {
		throw new UnexpectedCallError('Not supported "createTextNode" method');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	createTreeWalker(root: Node, whatToShow?: number, filter?: NodeFilter | null): TreeWalker {
		throw new UnexpectedCallError('Not supported "createTreeWalker" method');
	}

	/**
	 * @implements `@markuplint/ml-core` API: `MLDocument`
	 */
	debugMap(): string[] {
		return nodeListToDebugMaps(this.nodeList, true);
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	elementFromPoint(x: number, y: number): Element | null {
		throw new UnexpectedCallError('Not supported "elementFromPoint" method');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	elementsFromPoint(x: number, y: number): Element[] {
		throw new UnexpectedCallError('Not supported "elementsFromPoint" method');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	evaluate(
		expression: string,
		contextNode: Node,
		resolver?: XPathNSResolver | null,
		type?: number,
		result?: XPathResult | null,
	): XPathResult {
		throw new UnexpectedCallError('Not supported "evaluate" method');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	execCommand(commandId: string, showUI?: boolean, value?: string): boolean {
		throw new UnexpectedCallError('Not supported "execCommand" method');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	exitFullscreen(): Promise<void> {
		throw new UnexpectedCallError('Not supported "exitFullscreen" method');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	exitPictureInPicture(): Promise<void> {
		throw new UnexpectedCallError('Not supported "exitPictureInPicture" method');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	exitPointerLock(): void {
		throw new UnexpectedCallError('Not supported "exitPointerLock" method');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	getAnimations(): Animation[] {
		throw new UnexpectedCallError('Not supported "getAnimations" method');
	}

	/**
	 * @implements DOM API: `Document`
	 */
	getElementById(elementId: string) {
		// TODO:
		return this.querySelector(`#${elementId}`);
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	getElementsByClassName(classNames: string): HTMLCollectionOf<MLElement<T, O>> {
		return nodeListToHTMLCollection(this.querySelectorAll(classNames));
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	getElementsByName(elementName: string): NodeListOf<HTMLElement> {
		throw new UnexpectedCallError('Not supported "getElementsByName" method');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	getElementsByTagName(qualifiedName: string): HTMLCollectionOf<MLElement<T, O>> {
		return nodeListToHTMLCollection(this.querySelectorAll(qualifiedName));
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	getElementsByTagNameNS(namespace: any, localName: any): any {
		throw new UnexpectedCallError('Not supported "getElementsByTagNameNS" method');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	getSelection(): Selection | null {
		throw new UnexpectedCallError('Not supported "getSelection" method');
	}

	/**
	 * @implements `@markuplint/ml-core` API: `MLDocument`
	 */
	getTokenList() {
		if (this.#tokenList) {
			return this.#tokenList;
		}
		const tokens: MLToken[] = [];
		for (const node of this.nodeList) {
			tokens.push(node);
			if (node.is(node.ELEMENT_NODE) && node.closeTag) {
				tokens.push(node.closeTag);
			}
		}
		tokens.sort((a, b) => a.startOffset - b.startOffset);
		this.#tokenList = Object.freeze(tokens);
		return this.#tokenList;
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	hasFocus(): boolean {
		throw new UnexpectedCallError('Not supported "hasFocus" method');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	hasStorageAccess(): Promise<boolean> {
		throw new UnexpectedCallError('Not supported "hasStorageAccess" method');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	importNode<T extends Node>(node: T, deep?: boolean): T {
		throw new UnexpectedCallError('Not supported "importNode" method');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	open(url?: any, name?: any, features?: any): any {
		throw new UnexpectedCallError('Not supported "open" method');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	queryCommandEnabled(commandId: string): boolean {
		throw new UnexpectedCallError('Not supported "queryCommandEnabled" method');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	queryCommandIndeterm(commandId: string): boolean {
		throw new UnexpectedCallError('Not supported "queryCommandIndeterm" method');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	queryCommandState(commandId: string): boolean {
		throw new UnexpectedCallError('Not supported "queryCommandState" method');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	queryCommandSupported(commandId: string): boolean {
		throw new UnexpectedCallError('Not supported "queryCommandSupported" method');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	queryCommandValue(commandId: string): string {
		throw new UnexpectedCallError('Not supported "queryCommandValue" method');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @deprecated
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	releaseEvents(): void {
		throw new UnexpectedCallError('Not supported "releaseEvents" method');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	requestStorageAccess(): Promise<void> {
		throw new UnexpectedCallError('Not supported "requestStorageAccess" method');
	}

	/**
	 * @implements `@markuplint/ml-core` API: `MLDocument`
	 */
	setRule(rule: MLRule<T, O> | null) {
		this.currentRule = rule;
	}

	/**
	 * @implements `@markuplint/ml-core` API: `MLDocument`
	 */
	toString() {
		const html: string[] = [];
		for (const node of this.getTokenList()) {
			html.push(node.toString());
		}
		return html.join('');
	}

	/**
	 * @implements `@markuplint/ml-core` API: `MLDocument`
	 */
	walkOn(type: 'Element', walker: Walker<T, O, MLElement<T, O>>, skipWhenRuleIsDisabled?: boolean): Promise<void>;
	walkOn(type: 'Text', walker: Walker<T, O, MLText<T, O>>, skipWhenRuleIsDisabled?: boolean): Promise<void>;
	walkOn(type: 'Comment', walker: Walker<T, O, MLComment<T, O>>, skipWhenRuleIsDisabled?: boolean): Promise<void>;
	walkOn(type: 'Attr', walker: Walker<T, O, MLAttr<T, O>>, skipWhenRuleIsDisabled?: boolean): Promise<void>;
	walkOn(type: 'ElementCloseTag', walker: Walker<T, O, MLToken>, skipWhenRuleIsDisabled?: boolean): Promise<void>;
	walkOn(
		type: 'Element' | 'Text' | 'Comment' | 'Attr' | 'ElementCloseTag',
		walker: Walker<T, O, any>,
		skipWhenRuleIsDisabled: boolean = true,
	): Promise<void> {
		return sequentialWalker(this.nodeList, node => {
			if (skipWhenRuleIsDisabled && node.rule.disabled) {
				return;
			}
			if (type === 'Element' && node.is(node.ELEMENT_NODE)) {
				return walker(node);
			}
			if (type === 'Text' && node.is(node.TEXT_NODE)) {
				return walker(node);
			}
			if (type === 'Comment' && node.is(node.COMMENT_NODE)) {
				return walker(node);
			}
			if (type === 'Attr' && node.is(node.ELEMENT_NODE)) {
				return sequentialWalker(Array.from(node.attributes), attr => walker(attr));
			}
			if (type === 'ElementCloseTag' && node.is(node.ELEMENT_NODE) && node.closeTag) {
				return walker(node.closeTag);
			}
		});
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	write(...text: string[]): void {
		throw new UnexpectedCallError('Not supported "write" method');
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Document`
	 */
	writeln(...text: string[]): void {
		throw new UnexpectedCallError('Not supported "writeln" method');
	}

	private _pretending(pretenders?: Pretender[]) {
		if (docLog.enabled) {
			docLog('Pretending: %O', pretenders);
		}
		if (!pretenders) {
			return;
		}
		for (const node of this.nodeList) {
			if (node.is(node.ELEMENT_NODE)) {
				node.pretending(pretenders);
			}
		}
	}

	private _ruleMapping(ruleset: Ruleset) {
		if (docLog.enabled) {
			docLog('Rule Mapping: %O', Object.keys(ruleset.rules));
		}

		const ruleMapper = new RuleMapper(this);

		// global rules to #document
		Object.keys(ruleset.rules).forEach(ruleName => {
			const rule = ruleset.rules[ruleName];
			ruleMapper.set(this, ruleName, {
				from: 'rules',
				specificity: [0, 0, 0],
				rule,
			});
		});

		// add rules to node
		for (const node of this.nodeList) {
			if (docLog.enabled) {
				docLog('Add rules to node <%s>', node.nodeName);
			}

			// global rules to each element
			Object.keys(ruleset.rules).forEach(ruleName => {
				const rule = ruleset.rules[ruleName];
				ruleMapper.set(node, ruleName, {
					from: 'rules',
					specificity: [0, 0, 0],
					rule,
				});
			});

			if (!node.is(node.ELEMENT_NODE) && !node.is(node.TEXT_NODE)) {
				continue;
			}

			const selectorTarget = node.is(node.ELEMENT_NODE) ? node : null;

			// node specs and special rules for node by selector
			ruleset.nodeRules.forEach(nodeRule => {
				if (!nodeRule.rules) {
					return;
				}

				if (!selectorTarget) {
					return;
				}

				const selector = nodeRule.selector || nodeRule.regexSelector;

				const matches = matchSelector(selectorTarget, selector);

				if (!matches.matched) {
					return;
				}

				if (docLog.enabled) {
					docLog('Matched nodeRule: <%s>(%s)', node.nodeName, matches.selector || '*');
				}

				const ruleList = Object.keys(nodeRule.rules);

				for (const ruleName of ruleList) {
					const rule = nodeRule.rules[ruleName];
					const convertedRule = exchangeValueOnRule(rule, matches.data || {});
					if (convertedRule === undefined) {
						continue;
					}
					const globalRule = ruleset.rules[ruleName];
					const mergedRule = globalRule ? mergeRule(globalRule, convertedRule) : convertedRule;

					ruleLog('↑ nodeRule (%s): %O', ruleName, mergedRule);

					ruleMapper.set(node, ruleName, {
						from: 'nodeRules',
						specificity: matches.specificity,
						rule: mergedRule,
					});
				}
			});

			// overwrite rule to child node
			if (selectorTarget && ruleset.childNodeRules.length) {
				const descendants: MLNode<T, O>[] = [];
				const children = Array.from(selectorTarget.childNodes);
				syncWalk(children, childNode => {
					descendants.push(childNode);
				});

				ruleset.childNodeRules.forEach((nodeRule, i) => {
					if (!nodeRule.rules) {
						return;
					}
					const nodeRuleRules = nodeRule.rules;

					const selector = nodeRule.selector || nodeRule.regexSelector;
					if (!selector) {
						return;
					}

					const matches = matchSelector(selectorTarget, selector);
					if (!matches.matched) {
						return;
					}

					if (docLog.enabled) {
						docLog(
							'Matched childNodeRule: <%s>(%s), inheritance: %o',
							selectorTarget.nodeName,
							matches.selector || '*',
							!!nodeRule.inheritance,
						);
					}

					const targetDescendants = nodeRule.inheritance ? descendants : children;

					Object.keys(nodeRuleRules).forEach(ruleName => {
						const rule = nodeRuleRules[ruleName];

						const convertedRule = exchangeValueOnRule(rule, matches.data || {});
						if (convertedRule === undefined) {
							return;
						}
						const globalRule = ruleset.rules[ruleName];
						const mergedRule = globalRule ? mergeRule(globalRule, convertedRule) : convertedRule;

						ruleLog('↑ childNodeRule (%s): %O', ruleName, mergedRule);

						targetDescendants.forEach(descendant => {
							ruleMapper.set(descendant, ruleName, {
								from: 'childNodeRules',
								specificity: matches.specificity,
								rule: mergedRule,
							});
						});
					});
				});
			}
		}

		ruleMapper.apply();
	}
}
