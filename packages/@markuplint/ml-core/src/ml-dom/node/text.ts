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
	 */
	isRawTextElementContent() {
		return this.parentElement ? rawTextElements.has(this.parentElement.nodeName.toLowerCase()) : false;
	}

	/**
	 * @implements `@markuplint/ml-core` API: `MLText`
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
