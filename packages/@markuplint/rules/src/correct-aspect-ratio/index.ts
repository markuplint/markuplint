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
			if (el.localName !== 'img') {
				return;
			}

			if (el.hasSpreadAttr) {
				return;
			}

			const srcAttr = el.getAttributeNode('src');
			const widthAttr = el.getAttributeNode('width');
			const heightAttr = el.getAttributeNode('height');

			if (!srcAttr || !widthAttr || !heightAttr) {
				return;
			}

			if (srcAttr.isDynamicValue || widthAttr.isDynamicValue || heightAttr.isDynamicValue) {
				return;
			}

			const src = srcAttr.value;
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
