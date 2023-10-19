import type { MLASTAttr } from '@markuplint/ml-ast';

const duplicatableAttrs = new Set(['class', 'style']);

export function attr(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	attr: MLASTAttr,
): MLASTAttr {
	if (attr.type !== 'html-attr') {
		const name = attr.potentialName;
		if (duplicatableAttrs.has(name)) {
			attr.isDuplicatable = true;
		}
		return attr;
	}

	{
		/**
		 * `v-on`
		 */
		const [, directive, potentialName, modifier] = attr.name.raw.match(/^(v-on:|@)([^.]+)(?:\.([^.]+))?$/i) ?? [];
		if (directive && potentialName) {
			return {
				...attr,
				potentialName: `on${potentialName.toLowerCase()}`,
				isDynamicValue: true,
				// @ts-ignore
				_modifier: modifier,
			};
		}
	}

	{
		/**
		 * `v-bind`
		 */
		const [, directive, potentialName, modifier] = attr.name.raw.match(/^(v-bind:|:)([^.]+)(?:\.([^.]+))?$/i) ?? [];
		if (directive && potentialName) {
			if (duplicatableAttrs.has(potentialName.toLowerCase())) {
				attr.isDuplicatable = true;
			}

			if (!modifier) {
				return {
					...attr,
					potentialName,
					isDynamicValue: true,
				};
			}

			switch (modifier) {
				case '.attr': {
					return {
						...attr,
						potentialName,
						isDynamicValue: true,
						// @ts-ignore
						_modifier: modifier,
					};
				}
				/* eslint-disable unicorn/no-useless-switch-case */
				// TODO: Supporting for `prop` and `camel` https://github.com/markuplint/markuplint/pull/681
				case '.prop':
				case '.camel':
				default: {
					const name = `v-bind:${potentialName}${modifier ?? ''}`;
					return {
						...attr,
						potentialName: attr.name.raw === name ? undefined : name,
						isDirective: true,
						// @ts-ignore
						_modifier: modifier,
					};
				}
				/* eslint-enable unicorn/no-useless-switch-case */
			}
		}
	}

	{
		/**
		 * `v-model`
		 */
		const [, directive, modifier] = attr.name.raw.match(/^(v-model)(?:\.([^.]+))?$/i) ?? [];
		if (directive) {
			// TODO: Supporting for `v-model` https://github.com/markuplint/markuplint/pull/681
			return {
				...attr,
				isDirective: true,
				// @ts-ignore
				_modifier: modifier,
			};
		}
	}

	{
		/**
		 * `v-slot`
		 */
		const slotName = (attr.name.raw.match(/^(v-slot:|#)(.+)$/i) ?? [])[2];
		const name = `v-slot:${slotName}`;
		if (slotName) {
			return {
				...attr,
				potentialName: attr.name.raw === name ? undefined : name,
				isDirective: true,
			};
		}
	}

	/**
	 * If directives
	 */
	if (attr.name.raw.startsWith('v-')) {
		return {
			...attr,
			isDirective: true,
		};
	}

	return attr;
}
