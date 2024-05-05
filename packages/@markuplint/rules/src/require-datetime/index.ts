import type { Lang } from './types.js';

import { createRule } from '@markuplint/ml-core';
import { check } from '@markuplint/types';

import meta from './meta.js';
import { getCandidateDatetimeString } from './utils.js';

type Options = {
	langs?: Lang[];
};

export default createRule<boolean, Options>({
	meta: meta,
	defaultOptions: {
		langs: undefined,
	},
	verify({ document, report, t }) {
		for (const time of document.querySelectorAll('time:not([datetime])')) {
			if (time.hasMutableChildren()) {
				continue;
			}

			const content = time.textContent.trim();
			const result = check(content, 'DateTime');

			if (result.matched) {
				continue;
			}

			const candidate = getCandidateDatetimeString(content, time.rule.options.langs);

			if (candidate) {
				report({
					scope: time,
					message: t('need {0*}', `datetime="${candidate}"`),
				});
				continue;
			}

			report({
				scope: time,
				message: t('need {0}', t('the "{0*}" {1}', 'datetime', 'attribute')),
			});
		}
	},
});
