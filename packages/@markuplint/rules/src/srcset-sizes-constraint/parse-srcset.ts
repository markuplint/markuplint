/**
 * Shared by the four rules split out of the former `srcset-sizes-constraint` rule:
 * `no-unpaired-srcset-sizes`, `no-mixed-srcset-descriptors`, and
 * `sizes-auto-requires-lazy-loading` (`no-always-matching-source` does not parse
 * `srcset` at all).
 */

import { splitOnAsciiWhitespace, trimAsciiWhitespace } from '@markuplint/shared';

/**
 * Descriptor type for an image candidate in a srcset attribute.
 * - `width`: ends with `w` (e.g., `480w`)
 * - `density`: ends with `x` (e.g., `2x`)
 * - `none`: no descriptor (implies `1x`)
 */
type DescriptorType = 'width' | 'density' | 'none';

type SrcsetCandidate = {
	readonly url: string;
	readonly descriptorType: DescriptorType;
};

type ParseResult = {
	readonly candidates: readonly SrcsetCandidate[];
	/** At least one candidate has a width descriptor (`w`). */
	readonly hasWidth: boolean;
	/** At least one candidate has a pixel density descriptor (`x`). */
	readonly hasDensity: boolean;
	/** At least one candidate has no descriptor (implied `1x`). */
	readonly hasImplied: boolean;
};

/**
 * Parse a `srcset` attribute value into its image candidates.
 *
 * @param value - The raw `srcset` attribute value string
 * @returns Parsed result with candidates and descriptor flags
 * @see https://html.spec.whatwg.org/multipage/images.html#srcset-attributes
 */

export function parseSrcset(value: string): ParseResult {
	const raw = trimAsciiWhitespace(value);
	if (raw === '') {
		return { candidates: [], hasWidth: false, hasDensity: false, hasImplied: false };
	}

	const candidates: SrcsetCandidate[] = [];
	let hasWidth = false;
	let hasDensity = false;
	let hasImplied = false;

	for (const segment of raw.split(',')) {
		const tokens = splitOnAsciiWhitespace(segment);
		const url = tokens[0];
		if (!url) {
			continue;
		}

		const descriptor = tokens[1];
		let descriptorType: DescriptorType = 'none';

		if (descriptor) {
			if (/^[1-9]\d*w$/.test(descriptor)) {
				descriptorType = 'width';
				hasWidth = true;
			} else if (/^\d+(?:\.\d+)?x$/.test(descriptor)) {
				descriptorType = 'density';
				hasDensity = true;
			}
			// Invalid descriptors are ignored here; type validation handles them.
		} else {
			hasImplied = true;
		}

		candidates.push({ url, descriptorType });
	}

	return { candidates, hasWidth, hasDensity, hasImplied };
}

/**
 * Check whether a `sizes` attribute value is `auto` or starts with `auto,`.
 *
 * HTML LS § allows-auto-sizes: the value is "auto" (ASCII case-insensitive),
 * or starts with "auto," (ASCII case-insensitive). The value is not trimmed.
 * Examples: `"auto"`, `"auto, 100vw"`, `"AUTO,100vw"`. Not: `"auto 100vw"`.
 *
 * @param value - The raw `sizes` attribute value string
 * @returns `true` if the value is `auto` or starts with `auto,`
 * @see https://html.spec.whatwg.org/multipage/embedded-content.html#allows-auto-sizes
 */

export function hasSizesAuto(value: string): boolean {
	const v = value.toLowerCase();
	return v === 'auto' || v.startsWith('auto,');
}

/**
 * Check whether a `sizes` attribute value specifies the `auto` keyword, read
 * by the `<source-size-list>` grammar rather than by its literal form.
 *
 * The grammar puts `auto` only at the start of the list, so only the first
 * entry is read; `auto` anywhere else is a syntax error of the value, which
 * the `SourceSizeList` type of `@markuplint/types` reports. CSS comments
 * and ASCII whitespace around the keyword are allowed by the grammar, which
 * is what a `source` element's `sizes` takes:
 *
 * > A source element's sizes attribute has no such restriction, so comments
 * > and whitespace are allowed around auto there as permitted by the
 * > <source-size-list> grammar.
 *
 * A comment is replaced with a space, as the CSS tokenizer separates tokens
 * at it (a comment inside the word does not make it `auto`); an unclosed
 * comment runs to the end. Examples: `"auto"`, `" AUTO , 100vw"`, `auto`
 * after a comment. Not: `"auto 100vw"`, `"100vw, auto"`.
 *
 * @param value - The raw `sizes` attribute value string
 * @returns `true` if the first entry of the list is the keyword `auto`
 * @see https://html.spec.whatwg.org/multipage/images.html#sizes-attributes
 */
export function specifiesSizesAuto(value: string): boolean {
	const withoutComments = value.replaceAll(/\/\*[\s\S]*?(?:\*\/|$)/gu, ' ');
	const firstEntry = withoutComments.split(',', 1)[0] ?? '';
	return trimAsciiWhitespace(firstEntry).toLowerCase() === 'auto';
}
