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
	async verify({ document, report, t }) {
		await document.walkOn('Element', async node => {
			if (node.hasSpreadAttr) {
				return;
			}

			const customRequiredAttrs = typeof node.rule.value === 'string' ? [node.rule.value] : node.rule.value;
			const attrSpec = getAttrSpecs(node.nameWithNS, document.specs);

			const attributeSpecs: Record<
				string,
				Pick<Attribute, 'name' | 'required' | 'requiredEither' | 'condition'> & {
					values: string[];
				}
			> = {};

			if (attrSpec && !node.isCustomElement) {
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
				const didntHave = !node.hasAttribute(spec.name);

				let invalid = false;

				if (spec.requiredEither) {
					const candidate = [...spec.requiredEither, spec.name];
					invalid = !candidate.some(attrName => node.hasAttribute(attrName));
				} else if (spec.required === true) {
					invalid = attrMatches(node, spec.condition) && didntHave;
				} else if (spec.required) {
					if ('ancestor' in spec.required && spec.required.ancestor) {
						const ancestorList = Array.isArray(spec.required.ancestor)
							? spec.required.ancestor
							: [spec.required.ancestor];
						const ancestors = ancestorList
							.join(',')
							.split(',')
							.map(a => a.trim());
						invalid = ancestors.some(a => node.closest(a)) && didntHave;
					}
				}

				if (invalid) {
					const message = t(
						'{0} expects {1}',
						t('the "{0*}" {1}', node.nodeName, 'element'),
						t('the "{0*}" {1}', spec.name, 'attribute'),
					);
					report({
						scope: node,
						message,
					});
				}

				const value = node.getAttribute(spec.name);

				if (spec.values.length && value) {
					const matched = spec.values.some(pattern => match(value, pattern));
					if (!matched) {
						const expects = spec.values.length === 1 ? t(spec.values) : t('either {0}', t(spec.values));
						const message = t('{0} expects {1}', t('the "{0*}" {1}', spec.name, 'attribute'), expects);
						const attrToken = node.getAttributeToken(spec.name);
						const valueToken = attrToken[0]?.attrType === 'html-attr' ? attrToken[0].value : null;
						const token = valueToken || attrToken[0];
						report({
							scope: {
								rule: node.rule,
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
