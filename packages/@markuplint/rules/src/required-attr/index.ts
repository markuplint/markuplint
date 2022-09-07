import type { Attribute } from '@markuplint/html-spec';

import { createRule, getAttrSpecs } from '@markuplint/ml-core';

import { attrMatches, match } from '../helpers';

type RequiredAttributes = string | (string | Attr)[];

type Attr = {
	name: string;
	value: string | string[];
};

export default createRule<RequiredAttributes>({
	defaultValue: [],
	verify({ document, report, t }) {
		void document.walkOn('Element', el => {
			if (el.hasSpreadAttr) {
				return;
			}

			const customRequiredAttrs = typeof el.rule.value === 'string' ? [el.rule.value] : el.rule.value;
			const attrSpec = getAttrSpecs(el, document.specs);

			const attributeSpecs: Record<
				string,
				Pick<Attribute, 'name' | 'required' | 'requiredEither' | 'condition'> & {
					values: string[];
				}
			> = {};

			if (attrSpec && !el.isCustomElement) {
				for (const spec of attrSpec) {
					if (spec.required || spec.requiredEither || spec.condition) {
						attributeSpecs[spec.name] = {
							...spec,
							values: [],
						};
					}
				}
			}

			for (const req of customRequiredAttrs) {
				let name: string;
				const values: string[] = [];

				if (typeof req === 'string') {
					name = req;
				} else {
					name = req.name;
					if (Array.isArray(req.value)) {
						values.push(...req.value);
					} else {
						values.push(req.value);
					}
				}

				attributeSpecs[name] = {
					name,
					values,
					required: true,
				};
			}

			for (const spec of Object.values(attributeSpecs)) {
				const didntHave = !el.hasAttribute(spec.name);

				let invalid = false;

				if (spec.requiredEither) {
					const candidate = [...spec.requiredEither, spec.name];
					invalid = !candidate.some(attrName => el.hasAttribute(attrName));
				} else if (spec.required === true) {
					invalid = attrMatches(el, spec.condition) && didntHave;
				} else if (spec.required) {
					const selector = Array.isArray(spec.required) ? spec.required.join(',') : spec.required;
					invalid = el.matches(selector) && didntHave;
				}

				if (invalid) {
					const message = t(
						'{0} expects {1}',
						t('the "{0*}" {1}', el.localName, 'element'),
						t('the "{0*}" {1}', spec.name, 'attribute'),
					);
					report({
						scope: el,
						message,
					});
				}

				const value = el.getAttribute(spec.name);

				if (spec.values.length && value) {
					const matched = spec.values.some(pattern => match(value, pattern));
					if (!matched) {
						const expects = spec.values.length === 1 ? t(spec.values) : t('either {0}', t(spec.values));
						const message = t('{0} expects {1}', t('the "{0*}" {1}', spec.name, 'attribute'), expects);
						const attrToken = el.getAttributeToken(spec.name);
						const valueToken = attrToken[0].valueNode;
						const token = valueToken || attrToken[0];
						report({
							scope: {
								rule: el.rule,
								raw: token.raw,
								startCol: token.startCol,
								startLine: token.startLine,
							},
							message,
						});
					}
				}
			}
		});
	},
});
