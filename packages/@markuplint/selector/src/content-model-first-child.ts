import type { SelectorElement } from './types.js';

const ELEMENT_NODE = 1;
const TEXT_NODE = 3;

/**
 * An entry of a content model category that holds only as the first child of its
 * parent: a compound selector with `:first-child` at its end (`style:first-child`).
 */
const FIRST_CHILD_ENTRY = /^([^\s>+~(),:]+):first-child$/;

/**
 * A character reference to ASCII whitespace. A host that gives the text as written
 * (markuplint's own DOM) still has it undecoded, while the DOM holds the character.
 * A numeric reference without its semicolon is a parse error that the tokenizer still
 * decodes; a digit after it belongs to the number and is left as text, so `&#109`
 * (`m`) does not count.
 */
const WHITESPACE_REFERENCE = /&(?:#[xX]0*(?:[9aAcCdD]|20);?|#0*(?:9|10|12|13|32);?|Tab;|NewLine;)/g;

/**
 * Whether the data of a text node is inter-element whitespace: ASCII whitespace
 * only, so a no-break space is text. A character reference to ASCII whitespace
 * counts as the character it stands for.
 *
 * @param data - The data of a text node
 * @returns `true` when the text is empty or only inter-element whitespace
 * @see https://html.spec.whatwg.org/multipage/dom.html#inter-element-whitespace
 */
export function isInterElementWhitespace(data: string): boolean {
	return /^[\t\n\f\r ]*$/.test(data.replaceAll(WHITESPACE_REFERENCE, ' '));
}

/**
 * Whether an element is the first child of its parent as the HTML Standard counts
 * it when it evaluates a content model, which `:first-child` does not: Selectors
 * count only sibling elements, but the HTML Standard ignores only comments and
 * inter-element whitespace ({@link isInterElementWhitespace}).
 *
 * Only a text node counts besides elements. A preprocessor block node (a template
 * expression such as `{{ msg }}`) does not: what it outputs is known only at run
 * time, and the content model check accepts a block for the same reason. Text and
 * elements inside a conditional block count wherever the parser leaves them among
 * the siblings, as the content of the block is taken as present. A host that does
 * not give `prevSibling` (optional in {@link SelectorElement}) is judged by the
 * elements alone.
 *
 * This sees the element's own parent, also inside a transparent element: the
 * content model of a transparent element is derived from its parent's, and the
 * element is still the first child of the transparent element.
 *
 * > Inter-element whitespace, comment nodes, and processing instruction nodes must be ignored
 * > when establishing whether an element's contents match the element's content model or not
 * > […]
 *
 * > Thus, an element A is said to be preceded or followed by a second element B if A and B have
 * > the same parent node and there are no other element nodes or Text nodes (other than
 * > inter-element whitespace) between them.
 *
 * @param el - The element to test
 * @returns `true` when no element and no non-whitespace text precede `el`
 * @see https://html.spec.whatwg.org/multipage/dom.html#content-models
 */
export function isContentModelFirstChild(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	el: SelectorElement,
): boolean {
	if (el.prevSibling === undefined) {
		return el.prevElementSibling == null;
	}
	let prev = el.prevSibling;
	while (prev) {
		if (prev.nodeType === ELEMENT_NODE) {
			return false;
		}
		if (prev.nodeType === TEXT_NODE && !isInterElementWhitespace(prev.nodeValue ?? '')) {
			return false;
		}
		prev = prev.prevSibling ?? null;
	}
	return true;
}

/**
 * The selector an entry of a content model category stands for when it holds only
 * as the first child of its parent (`style:first-child` → `style`), or `null` for
 * any other entry.
 *
 * The category paths (`:model()` and the content model check of the
 * `permitted-contents` rule) match such an entry by {@link isContentModelFirstChild}
 * instead of `:first-child`, so that text before the element counts as the HTML
 * Standard has it. An entry with `:first-child` anywhere else
 * (`:not(:first-child)`, `:has(> p:first-child)`) is not one: it is matched as
 * Selectors define it. The entries of `@markuplint/html-spec` are held to the
 * `X:first-child` form by a test (`content-model-first-child.spec.ts`).
 *
 * @param entry - An entry of a content model category
 * @returns The selector without `:first-child`, or `null`
 */
export function contentModelFirstChildBase(entry: string): string | null {
	return FIRST_CHILD_ENTRY.exec(entry)?.[1] ?? null;
}
