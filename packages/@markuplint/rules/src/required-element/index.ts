import { createRule } from '@markuplint/ml-core';

type Options = {
	ignoreHasMutableContents: boolean;
};

export default createRule<string[], Options>({
	defaultValue: [],
	defaultOptions: {
		ignoreHasMutableContents: true,
	},
	verify({ document, report, t }) {
		const hasMutableContent = document.nodeList.some(n => n.is(n.ELEMENT_NODE) && n.hasMutableChildren());
		if (!hasMutableContent) {
			for (const query of document.rule.value) {
				const exists = document.querySelectorAll(query);
				if (exists.length === 0) {
					const message = t('Require {0}', t('the "{0*}" {1}', query, 'element'));
					report({
						message,
						line: 1,
						col: 1,
						raw: document.nodeList[0].raw.slice(0, 1),
					});
				}
			}
		}

		void document.walkOn('Element', el => {
			if (el.rule.value === document.rule.value) {
				return;
			}
			if (el.rule.option.ignoreHasMutableContents && el.hasMutableChildren()) {
				return;
			}
			for (const query of el.rule.value) {
				const exists = Array.from(el.children).find(child => child.matches(query));
				if (!exists) {
					const message = t('Require {0}', t('the "{0*}" {1}', query, 'element'));
					report({
						scope: el,
						message,
					});
				}
			}
		});
	},
});
