import { createRule } from '@markuplint/ml-core';

import meta from './meta.js';

type OrderEntry = {
	readonly selector: string;
	readonly order?: 'source-order' | 'alphabetical';
	readonly attr?: string;
};

export type Value = readonly (string | OrderEntry)[];

type NormalizedEntry = {
	readonly selector: string;
	readonly order: 'source-order' | 'alphabetical';
	readonly attr?: string;
};

const DEFAULT_VALUE: Value = [
	'meta[charset]',
	'meta[http-equiv]',
	'meta[name="viewport"]',
	'title',
	{ selector: 'meta', order: 'alphabetical', attr: 'name' },
	'link',
	'style',
	'script',
];

function normalizeEntries(value: Value): readonly NormalizedEntry[] {
	return value.map(entry => {
		if (typeof entry === 'string') {
			return { selector: entry, order: 'source-order' as const };
		}
		return { selector: entry.selector, order: entry.order ?? 'source-order', attr: entry.attr };
	});
}

type ElementInfo = {
	readonly startOffset: number;
	readonly groupIndex: number;
	readonly subKey: string | number;
	readonly sourceIndex: number;
	readonly elementText: string;
	readonly localName: string;
};

export default createRule<Value>({
	meta: meta,
	defaultSeverity: 'warning',
	defaultValue: DEFAULT_VALUE,
	verify({ document, report, t }) {
		const head = document.querySelector('head');
		if (!head) {
			return;
		}

		const children = [...head.children];
		if (children.length <= 1) {
			return;
		}

		const value: Value = head.rule.value ?? DEFAULT_VALUE;
		const entries = normalizeEntries(value);

		// Use entries.length as the unmatched group index instead of Infinity
		// to avoid potential Infinity arithmetic issues (e.g. Infinity - Infinity = NaN).
		const unmatchedGroupIndex = entries.length;

		// Use offset-based text extraction instead of AST traversal because
		// raw text elements (script, style) have empty childNodes in the AST.
		const docString = document.toString();

		const blocks: ElementInfo[] = children.map((el, sourceIndex) => {
			let groupIndex = unmatchedGroupIndex;
			for (const [i, entry_] of entries.entries()) {
				if (el.matches(entry_.selector)) {
					groupIndex = i;
					break;
				}
			}
			const entry = groupIndex < entries.length ? entries[groupIndex] : undefined;
			let subKey: string | number;
			if (entry && entry.order === 'alphabetical' && entry.attr) {
				subKey = el.getAttribute(entry.attr) ?? '';
			} else {
				subKey = sourceIndex;
			}
			const endOffset = getElementEndOffset(el);
			const elementText = docString.slice(el.startOffset, endOffset);
			return {
				startOffset: el.startOffset,
				groupIndex,
				subKey,
				sourceIndex,
				elementText,
				localName: el.localName,
			};
		});

		const sorted = blocks.toSorted((a, b) => {
			if (a.groupIndex !== b.groupIndex) {
				return a.groupIndex - b.groupIndex;
			}
			if (typeof a.subKey === 'string' && typeof b.subKey === 'string') {
				// Use simple comparison operators instead of localeCompare to ensure
				// consistent ordering across different environments and locales.
				if (a.subKey < b.subKey) {
					return -1;
				}
				if (a.subKey > b.subKey) {
					return 1;
				}
			}
			return a.sourceIndex - b.sourceIndex;
		});

		// Only the first violation carries a fix because it replaces
		// the entire <head> content at once to reorder all elements.
		const ms = head.rule.severity === 'error' ? 'must' : 'should';
		let firstViolation = true;
		for (let i = 0; i < blocks.length; i++) {
			if (blocks[i]!.sourceIndex !== sorted[i]!.sourceIndex) {
				const currentEl = children[i]!;
				const expectedInfo = sorted[i]!;
				const currentInfo = blocks[i]!;
				report({
					scope: currentEl,
					message: t(
						`{0} ${ms} be before {1}`,
						t('the "{0*}" {1}', expectedInfo.localName, 'element'),
						t('the "{0*}" {1}', currentInfo.localName, 'element'),
					),
					fix: firstViolation
						? fixer => {
								const headOpenEnd = head.startOffset + head.raw.length;
								const lastChild = children.at(-1)!;
								const headCloseStart = head.closeTag
									? head.closeTag.startOffset
									: getElementEndOffset(lastChild);

								const originalContent = docString.slice(headOpenEnd, headCloseStart);
								const newContent = buildFixedContent(originalContent, headOpenEnd, blocks, sorted);

								return fixer.replaceRange([headOpenEnd, headCloseStart], newContent);
							}
						: undefined,
				});
				firstViolation = false;
			}
		}
	},
});

function getElementEndOffset(el: {
	readonly startOffset: number;
	readonly raw: string;
	readonly closeTag: { readonly startOffset: number; readonly raw: string } | null;
}): number {
	if (el.closeTag) {
		return el.closeTag.startOffset + el.closeTag.raw.length;
	}
	return el.startOffset + el.raw.length;
}

function buildFixedContent(
	originalContent: string,
	headOpenEnd: number,
	blocks: readonly ElementInfo[],
	sorted: readonly ElementInfo[],
): string {
	const prefixes: string[] = [];
	for (let i = 0; i < blocks.length; i++) {
		const block = blocks[i]!;
		const elStart = block.startOffset - headOpenEnd;
		let prefixStart: number;
		if (i === 0) {
			prefixStart = 0;
		} else {
			const prevBlock = blocks[i - 1]!;
			const prevEnd = prevBlock.startOffset - headOpenEnd + prevBlock.elementText.length;
			prefixStart = prevEnd;
		}
		prefixes.push(originalContent.slice(prefixStart, elStart));
	}

	const lastBlock = blocks.at(-1)!;
	const trailStart = lastBlock.startOffset - headOpenEnd + lastBlock.elementText.length;
	const trailing = originalContent.slice(trailStart);

	let result = '';
	for (const [i, element] of sorted.entries()) {
		result += prefixes[i];
		result += element.elementText;
	}
	result += trailing;

	return result;
}
