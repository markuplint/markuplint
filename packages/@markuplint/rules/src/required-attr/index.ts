import type { Attribute } from '@markuplint/html-spec';

import { createRule, getAttrSpecs } from '@markuplint/ml-core';

import { attrMatches, match } from '../helpers.js';

import meta from './meta.js';

type RequiredAttributes = string | (string | Attr)[];

type Attr = {
	name: string;
	value?: string | string[];
};

export default createRule<RequiredAttributes>({
	meta: meta,
	defaultValue: [],
	async verify({ document, report, t }) {
		await document.walkOn('Element', el => {
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

			if (attrSpec && el.elementType === 'html') {
				for (const spec of attrSpec) {
					if (spec.required != null || spec.requiredEither || spec.condition != null) {
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
					} else if (req.value) {
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

				const candidate: string[] = [spec.name];

				let invalid = false;

				if (spec.requiredEither) {
					candidate.push(...spec.requiredEither);
					invalid = !candidate.some(attrName => el.hasAttribute(attrName));
				} else if (spec.required === true) {
					invalid = attrMatches(el, spec.condition) && didntHave;
				} else if (spec.required != null && spec.required !== false) {
					const selector = typeof spec.required === 'string' ? spec.required : spec.required.join(',');
					invalid = el.matches(selector) && didntHave;
				}

				candidate.sort();

				if (invalid) {
					const expects =
						candidate.length === 1
							? t('the "{0*}" {1}', spec.name, 'attribute')
							: t(
									'{0} {1}',
									candidate
										.map(attrName => t('the "{0*}"', attrName))
										// eslint-disable-next-line unicorn/no-array-reduce
										.reduce((a, b) => t('{0} or {1}', a, b)),
									t('attribute'),
								);

					const message = t('{0} expects {1}', t('the "{0*}" {1}', el.localName, 'element'), expects);
					report({
						scope: el,
						message,
					});
				}

				const value = el.getAttribute(spec.name);

				if (spec.values.length > 0 && value) {
					const matched = spec.values.some(pattern => match(value, pattern));
					if (!matched) {
						const expects = spec.values.length === 1 ? t(spec.values) : t('either {0}', t(spec.values));
						const message = t('{0} expects {1}', t('the "{0*}" {1}', spec.name, 'attribute'), expects);
						const attrToken = el.getAttributeToken(spec.name);
						const valueToken = attrToken[0]?.valueNode;
						const token = valueToken ?? attrToken[0];
						if (token) {
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
			}
		});
	},
});
