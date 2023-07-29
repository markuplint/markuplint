import type { Lang } from './types.js';

import { createRule } from '@markuplint/ml-core';
import { check } from '@markuplint/types';

import { getCandidateDatetimeString } from './utils.js';

type Options = {
	langs?: Lang[];
};

export default createRule<boolean, Options>({
	defaultOptions: {
		langs: undefined,
	},
	verify({ document, report, t }) {
		document.querySelectorAll('time:not([datetime])').forEach(time => {
			if (time.hasMutableChildren()) {
				return;
			}

			const content = time.textContent.trim();
			const result = check(content, 'DateTime');

			if (result.matched) {
				return;
			}

			const candidate = getCandidateDatetimeString(content, time.rule.options.langs);

			if (candidate) {
				report({
					scope: time,
					message: t('need {0*}', `datetime="${candidate}"`),
				});
				return;
			}

			report({
				scope: time,
				message: t('need {0}', t('the "{0*}" {1}', 'datetime', 'attribute')),
			});
		});
	},
});
