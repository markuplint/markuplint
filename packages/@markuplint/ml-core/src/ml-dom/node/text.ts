import type { TextNodeType } from './types.js';
import type { MLASTText } from '@markuplint/ml-ast';
import type { PlainData, RuleConfigValue } from '@markuplint/ml-config';

import { MLCharacterData } from './character-data.js';
import { UnexpectedCallError } from './unexpected-call-error.js';

/**
 * Raw text elements
 *
 * @see https://html.spec.whatwg.org/multipage/syntax.html#raw-text-elements
 */
const rawTextElements = new Set(['script', 'style']);

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
	 * **IT THROWS AN ERROR WHEN CALLING THIS.**
	 *
	 * @unsupported
	 * @implements DOM API: `Text`
	 */
	get assignedSlot(): HTMLSlotElement {
		throw new UnexpectedCallError('Not supported  "assignedSlot" property');
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
	 * Checks whether this text node contains only whitespace characters.
	 *
	 * @implements `@markuplint/ml-core` API: `MLText`
	 * @returns True if the raw content is composed entirely of whitespace
	 */
	isWhitespace() {
		return /^\s+$/.test(this.raw);
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
