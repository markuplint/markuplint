import type { MLElement } from './element.js';
import type { TextNodeType } from './types.js';
import type { MLASTText } from '@markuplint/ml-ast';
import type { PlainData, RuleConfigValue } from '@markuplint/ml-config';

import { getAssignedSlot, getFlatTreeSlot } from '../helper/slot-assignment.js';

import { MLCharacterData } from './character-data.js';
import { UnexpectedCallError, decodeEntities, hasText } from '@markuplint/shared';

/**
 * Raw text elements
 *
 * @see https://html.spec.whatwg.org/multipage/syntax.html#raw-text-elements
 */
const rawTextElements = new Set(['script', 'style']);

/**
 * The elements of the HTML namespace whose content the tokenizer reads without a character reference (a wider
 * set than `rawTextElements`, which is what `isRawTextElementContent` asks about): the
 * RAWTEXT state (`style`, `xmp`, `iframe`, `noembed`, `noframes`), the script data state (`script`) and the
 * PLAINTEXT state (`plaintext`). `noscript` is RAWTEXT only where scripting is enabled, which markuplint does not
 * assume (`@markuplint/html-parser` parses with scripting disabled), so its content is markup. The content of
 * `title` and `textarea` is RCDATA, which decodes them.
 *
 * Which element takes which state is said by the tree construction: the generic raw text and RCDATA element
 * parsing algorithms that the in head and in body insertion modes run for these start tags.
 *
 * @see https://html.spec.whatwg.org/multipage/parsing.html#generic-raw-text-element-parsing-algorithm
 * @see https://html.spec.whatwg.org/multipage/parsing.html#parsing-main-inhead
 * @see https://html.spec.whatwg.org/multipage/parsing.html#parsing-main-inbody
 * @see https://html.spec.whatwg.org/multipage/parsing.html#rawtext-state
 * @see https://html.spec.whatwg.org/multipage/parsing.html#script-data-state
 * @see https://html.spec.whatwg.org/multipage/parsing.html#plaintext-state
 * @see https://html.spec.whatwg.org/multipage/parsing.html#rcdata-state
 */
const NO_CHARACTER_REFERENCE_ELEMENTS: ReadonlySet<string> = new Set([
	'script',
	'style',
	'xmp',
	'iframe',
	'noembed',
	'noframes',
	'plaintext',
]);

/**
 * Represents a DOM Text node wrapper in the markuplint DOM tree.
 * Wraps an AST text token and provides text-specific operations such as
 * detecting raw text element content and whitespace-only nodes.
 *
 * @template T - The rule configuration value type
 * @template O - The rule options type
 */
export class MLText<T extends RuleConfigValue, O extends PlainData = undefined>
	extends MLCharacterData<T, O, MLASTText>
	implements Text
{
	/**
	 * The slot of an open declarative shadow root that this text is assigned to, or `null` when no
	 * slot takes it, the root is closed (the DOM does not expose it), or the assignment is not known.
	 *
	 * @implements DOM API: `Text`
	 * @see https://dom.spec.whatwg.org/#dom-slotable-assignedslot
	 */
	get assignedSlot(): HTMLSlotElement | null {
		return getAssignedSlot(this) as HTMLSlotElement | null;
	}

	/**
	 * The characters of the text, as the DOM has them: the character references of the source (`&#32;`,
	 * `&nbsp;`, `&lt;`) are decoded, as the tokenizer decodes them in the data and RCDATA states, except in the
	 * content of an element whose content the tokenizer reads without one (`script`, `style`, …). `raw` stays the
	 * source text, which a rule that points at a position reads.
	 *
	 * A text that a template language interpolates (`{{ … }}`, `{…}`) is not a text node: its parser hands it over
	 * as a block, so it is not decoded here.
	 *
	 * A language that reads its text otherwise (JSX decodes its own set of character references in every element;
	 * Markdown keeps a code span as written; Vue and Svelte decode in `iframe` and the like) hands the characters
	 * over itself (`MLASTText#data`), and they are the data.
	 *
	 * @implements DOM API: `CharacterData`
	 * @see https://dom.spec.whatwg.org/#dom-characterdata-data
	 * @see https://html.spec.whatwg.org/multipage/parsing.html#data-state
	 * @see https://html.spec.whatwg.org/multipage/parsing.html#character-reference-state
	 */
	get data(): string {
		this.#data ??= this.#readData();
		return this.#data;
	}

	#data: string | undefined;

	#readData(): string {
		// The language read the text otherwise than the tokenizer of HTML (JSX, Markdown, Vue, Svelte)
		if (this._astToken.data !== undefined) {
			return this._astToken.data;
		}
		const parent = this.parentElement;
		if (
			parent?.namespaceURI === 'http://www.w3.org/1999/xhtml' &&
			NO_CHARACTER_REFERENCE_ELEMENTS.has(parent.localName)
		) {
			return this.raw;
		}
		// A CDATA section of foreign content is its characters as written, without its delimiters
		// @see https://html.spec.whatwg.org/multipage/parsing.html#cdata-section-state
		if (
			parent &&
			parent.namespaceURI !== 'http://www.w3.org/1999/xhtml' &&
			this.raw.startsWith('<![CDATA[') &&
			this.raw.endsWith(']]>')
		) {
			return this.raw.slice('<![CDATA['.length, -']]>'.length);
		}
		return this.raw.includes('&') ? decodeEntities(this.raw) : this.raw;
	}

	/**
	 * The slot that places this text in the flat tree. See {@link MLElement.getFlatTreeSlot}.
	 *
	 * @implements `@markuplint/ml-core` API: `MLText`
	 * @see https://dom.spec.whatwg.org/#find-a-slot
	 */
	getFlatTreeSlot(): MLElement<T, O> | null | undefined {
		return getFlatTreeSlot(this);
	}

	/**
	 * Returns `true` if this text node originated from an invalid (bogus) AST
	 * node, such as an orphaned end tag.
	 *
	 * @implements `@markuplint/ml-core` API: `MLText`
	 */
	get isBogus(): boolean {
		return (this._astToken as MLASTText & { readonly isBogus?: boolean }).isBogus ?? false;
	}

	/**
	 * Returns a string appropriate for the type of node as `Text`
	 *
	 * @see https://dom.spec.whatwg.org/#ref-for-attr%E2%91%A4
	 */
	get nodeName() {
		return '#text' as const;
	}

	/**
	 * Returns a number appropriate for the type of `Text`
	 */
	get nodeType(): TextNodeType {
		return this.TEXT_NODE;
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Text`
	 * @see https://dom.spec.whatwg.org/#ref-for-dom-text-splittext%E2%91%A0
	 */
	get wholeText(): string {
		throw new UnexpectedCallError('Not supported "wholeText" property');
	}

	/**
	 * Returns `true` if a parent element is `<script>` or `<style>`
	 *
	 * @implements `@markuplint/ml-core` API: `MLText`
	 * @see https://html.spec.whatwg.org/multipage/syntax.html#raw-text-elements
	 * @returns True if this text node is the content of a raw text element
	 */
	isRawTextElementContent() {
		return this.parentElement ? rawTextElements.has(this.parentElement.nodeName.toLowerCase()) : false;
	}

	/**
	 * Checks whether this text node contains only ASCII white space characters: U+00A0 and the other
	 * non-ASCII white space are characters of the text, not white space. A text of ASCII white space only is
	 * inter-element whitespace for HTML.
	 *
	 * @see https://html.spec.whatwg.org/multipage/dom.html#inter-element-whitespace
	 * @implements `@markuplint/ml-core` API: `MLText`
	 * @returns True if the characters of the text (`data`, with the character references decoded) are ASCII white
	 *   space only
	 */
	isWhitespace() {
		const data = this.data;
		return data !== '' && !hasText(data);
	}

	/**
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Text`
	 * @see https://dom.spec.whatwg.org/#ref-for-dom-text-wholetext%E2%91%A0
	 */
	splitText(offset: number): Text {
		throw new UnexpectedCallError('Not supported "splitText" method');
	}
}
