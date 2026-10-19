import type { Attribute } from '@markuplint/html-spec';

import { createRule, getAttrSpecs } from '@markuplint/ml-core';

import { attrMatches, match } from '../helpers.js';

import meta from './meta.js';

/** The rule value: either a single attribute name or an array of required attribute descriptors. */
type RequiredAttributes = string | (string | Attr)[];

/**
 * Descriptor for a required attribute with an optional set of allowed values.
 */
type Attr = {
	/** The attribute name that is required. */
	name: string;
	/** One or more allowed values for the attribute, if constrained. */
	value?: string | string[];
};

/**
 * Configuration options for the `require-attr` rule.
 */
type Options = {
	/**
	 * Attribute names to exclude from require-attribute checks, compared as the DOM compares attribute
	 * names: ASCII case-insensitive in the HTML syntax and for an HTML element that code sets through the
	 * DOM API (JSX, MDX, Vue), exact for an SVG/MathML element there, and a component's props are not folded.
	 */
	readonly ignoreAttrs?: readonly string[];
};

export default createRule<RequiredAttributes, Options>({
	meta: meta,
	defaultValue: [],
	defaultOptions: {},
	async verify({ document, report, t }) {
		await document.walkOn('Element', el => {
			if (el.hasSpreadAttr) {
				return;
			}

			const customRequiredAttrs = typeof el.rule.value === 'string' ? [el.rule.value] : el.rule.value;
			const attrSpec = getAttrSpecs(el, document.specs);
			const ignoreAttrs = el.rule.options.ignoreAttrs ?? [];
			const isIgnored = (name: string) => ignoreAttrs.some(ignored => el.isSameAttrName(ignored, name));

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

				// A name of the rule value that the spec table names too is one requirement, and the
				// rule value's is the one that counts
				for (const specName of Object.keys(attributeSpecs)) {
					if (el.isSameAttrName(specName, name)) {
						delete attributeSpecs[specName];
					}
				}

				attributeSpecs[name] = {
					name,
					values,
					required: true,
				};
			}

			for (const spec of Object.values(attributeSpecs)) {
				if (isIgnored(spec.name)) {
					if (spec.requiredEither) {
						const activeCandidates = spec.requiredEither.filter(n => !isIgnored(n));
						if (activeCandidates.length > 0) {
							const invalid = !activeCandidates.some(attrName => el.hasAttribute(attrName));
							if (invalid) {
								const sortedCandidate = activeCandidates.toSorted();
								const expects =
									sortedCandidate.length === 1
										? t('the "{0*}" {1}', sortedCandidate[0]!, 'attribute')
										: t(
												'{0} {1}',
												sortedCandidate
													.map(attrName => t('the "{0*}"', attrName))
													// eslint-disable-next-line unicorn/no-array-reduce
													.reduce((a, b) => t('{0} or {1}', a, b)),
												t('attribute'),
											);
								const message = t(
									'{0} expects {1}',
									t('the "{0*}" {1}', el.localName, 'element'),
									expects,
								);
								report({ scope: el, message });
							}
						}
					}
					continue;
				}

				const didntHave = !el.hasAttribute(spec.name);

				const candidate: string[] = [spec.name];

				let invalid = false;

				if (spec.requiredEither) {
					candidate.push(...spec.requiredEither);

					const activeCandidates = candidate.filter(n => !isIgnored(n));
					invalid = !activeCandidates.some(attrName => el.hasAttribute(attrName));
				} else if (spec.required === true) {
					invalid = attrMatches(el, spec.condition) && didntHave;
				} else if (spec.required != null && spec.required !== false) {
					const selector = typeof spec.required === 'string' ? spec.required : spec.required.join(',');
					invalid = el.matches(selector) && didntHave;
				}

				const sortedCandidate = candidate.filter(n => !isIgnored(n)).toSorted();

				if (invalid) {
					const expects =
						sortedCandidate.length === 1
							? t('the "{0*}" {1}', spec.name, 'attribute')
							: t(
									'{0} {1}',
									sortedCandidate
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
