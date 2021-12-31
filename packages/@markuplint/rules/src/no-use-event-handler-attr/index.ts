import { createRule } from '@markuplint/ml-core';

import { match } from '../helpers';

type Options = {
	ignore?: string | string[];
};

export default createRule<boolean, Options>({
	defaultServerity: 'warning',
	defaultValue: true,
	defaultOptions: {},
	async verify({ document, report, t }) {
		document.walkOn('Element', el => {
			if (el.isCustomElement) {
				return;
			}
			const ignoreList = Array.isArray(el.rule.option.ignore)
				? el.rule.option.ignore
				: el.rule.option.ignore
				? [el.rule.option.ignore]
				: [];

			el.attributes.forEach(attr => {
				const name = attr.getName().potential;

				for (const ignore of ignoreList) {
					if (match(name, ignore)) {
						return;
					}
				}

				if (/^on/i.test(name)) {
					report({
						scope: el,
						raw: attr.raw,
						line: attr.startLine,
						col: attr.startCol,
						message: t('{0} is disallowed', t('the "{0}" {1}', name, 'attribute')),
					});
				}
			});
		});
	},
});
