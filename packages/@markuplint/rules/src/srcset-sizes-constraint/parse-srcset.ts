/**
 * Shared by the four rules split out of the former `srcset-sizes-constraint` rule:
 * `no-unpaired-srcset-sizes`, `no-mixed-srcset-descriptors`, and
 * `sizes-auto-requires-lazy-loading` (`no-always-matching-source` does not parse
 * `srcset` at all).
 */

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
	const raw = value.trim();
	if (raw === '') {
		return { candidates: [], hasWidth: false, hasDensity: false, hasImplied: false };
	}

	const candidates: SrcsetCandidate[] = [];
	let hasWidth = false;
	let hasDensity = false;
	let hasImplied = false;

	for (const segment of raw.split(',')) {
		const tokens = segment.trim().split(/\s+/);
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
 * Check whether a `sizes` attribute value starts with `auto`.
 *
 * Per the spec, `auto` is only valid as the first entry in a sizes list.
 * Examples: `"auto"`, `"auto, 100vw"`, `"AUTO"`.
 *
 * @param value - The raw `sizes` attribute value string
 * @returns `true` if the value starts with `auto` (case-insensitive)
 * @see https://html.spec.whatwg.org/multipage/embedded-content.html#the-img-element
 */

export function hasSizesAuto(value: string): boolean {
	const v = value.trim().toLowerCase();
	return v === 'auto' || /^auto[\s,]/.test(v);
}
