import { createRule } from '@markuplint/ml-core';

import meta from './meta.js';
import { getImageDimensions } from './resolve-image-size.js';

type Options = {
	readonly documentRoot?: string;
};

export default createRule<boolean, Options>({
	meta: meta,
	defaultSeverity: 'warning',
	defaultOptions: {},
	async verify({ document, report }) {
		await document.walkOn('Element', async el => {
			const localName = el.localName;

			// Only check img and source (inside picture) elements
			if (localName !== 'img' && localName !== 'source') {
				return;
			}

			// source is only relevant inside <picture>
			if (localName === 'source' && el.parentElement?.localName !== 'picture') {
				return;
			}

			if (el.hasSpreadAttr) {
				return;
			}

			const widthAttr = el.getAttributeNode('width');
			const heightAttr = el.getAttributeNode('height');

			if (!widthAttr || !heightAttr) {
				return;
			}

			if (widthAttr.isDynamicValue || heightAttr.isDynamicValue) {
				return;
			}

			// Resolve the image URL from src (img) or srcset (source)
			let src: string;
			if (localName === 'img') {
				const srcAttr = el.getAttributeNode('src');
				if (!srcAttr || srcAttr.isDynamicValue) {
					return;
				}
				src = srcAttr.value;
			} else {
				const srcsetAttr = el.getAttributeNode('srcset');
				if (!srcsetAttr || srcsetAttr.isDynamicValue) {
					return;
				}
				const extracted = extractFirstSrcsetUrl(srcsetAttr.value);
				if (!extracted) {
					return;
				}
				src = extracted;
			}
			const widthStr = widthAttr.value;
			const heightStr = heightAttr.value;

			// Parse width/height as integers; skip if non-numeric
			const attrWidth = Number.parseInt(widthStr, 10);
			const attrHeight = Number.parseInt(heightStr, 10);
			if (!Number.isFinite(attrWidth) || !Number.isFinite(attrHeight) || attrWidth <= 0 || attrHeight <= 0) {
				return;
			}

			const documentRoot = el.rule.options?.documentRoot;
			const dimensions = await getImageDimensions(src, documentRoot, document.filename);
			if (!dimensions) {
				return;
			}

			const { width: actualWidth, height: actualHeight } = dimensions;

			// Cross-multiplication comparison to avoid floating-point errors
			if (attrWidth * actualHeight !== attrHeight * actualWidth) {
				report({
					scope: el,
					message: `The aspect ratio of the image (${actualWidth}:${actualHeight}) does not match the width/height attributes (${widthStr}:${heightStr})`,
				});
			}
		});
	},
});

function extractFirstSrcsetUrl(srcset: string): string | null {
	const first = srcset.trim().split(',')[0]?.trim();
	if (!first) {
		return null;
	}
	return first.split(/\s+/)[0] ?? null;
}
