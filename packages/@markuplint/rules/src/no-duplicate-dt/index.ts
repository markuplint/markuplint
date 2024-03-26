import { createRule } from '@markuplint/ml-core';

import meta from './meta.js';

export default createRule({
	meta: meta,
	verify({ document, report, t }) {
		const dlList = [...document.querySelectorAll('dl')];
		for (const dl of dlList) {
			const dtList = [...dl.querySelectorAll(':scope > dt, :scope > div > dt')];

			const names = new Set<string>();
			for (const dt of dtList) {
				// TODO: Supoort for alternative text for images and accessible names for contained elements.
				const name = dt.textContent?.trim();
				if (!name) {
					continue;
				}
				if (name) {
					if (names.has(name)) {
						report({
							scope: dt,
							message: t('{0} {1:c}', t('The {0}', 'name'), 'duplicated'),
						});
						continue;
					}
					names.add(name);
				}
			}
		}
	},
});
