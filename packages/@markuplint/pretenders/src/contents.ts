import type { PretenderContent, Slot } from '@markuplint/ml-config';

/**
 * Where a component puts its slots and what it renders around them.
 * Same meaning as `slots` and `contents` of a pretender.
 */
export type SlotInfo = {
	/**
	 * `null`: the component never renders its children. `true`: the element that
	 * wraps the children is the root itself. An array: the inner element(s) that
	 * wrap the children.
	 */
	readonly slots: null | true | readonly Slot[];

	/**
	 * The static direct children of the root, in order. Empty when `slots` is an array,
	 * because the content of the root is then irrelevant to the given children.
	 */
	readonly contents: readonly PretenderContent[];
};

/**
 * A direct child of the element that wraps the slot, before text is resolved.
 */
export type ContentEntry = PretenderContent | { readonly text: true };

/**
 * Text has no entry of its own. Beside elements it can still satisfy a content model
 * (`<ruby>漢<rt>kan</rt></ruby>` needs text before `rt`), so it is unknown content there.
 * Text alone cannot be what a required child needs, and is dropped.
 */
export function resolveTextEntries(entries: readonly ContentEntry[]): PretenderContent[] {
	const hasElement = entries.some(entry => 'element' in entry);
	const contents: PretenderContent[] = [];
	for (const entry of entries) {
		if (!('text' in entry)) {
			contents.push(entry);
			continue;
		}
		const last = contents.at(-1);
		if (hasElement && !(last && 'dynamic' in last)) {
			contents.push({ dynamic: true });
		}
	}
	return contents;
}

/**
 * `[]` and `[{ slot: true }]` mean "the given children are the whole content",
 * which is what omitting `contents` means, so scanners do not write them out.
 */
export function isTrivialContents(contents: readonly PretenderContent[]) {
	const [first] = contents;
	return contents.length === 0 || (contents.length === 1 && first != null && 'slot' in first);
}
