import type { Token } from '@markuplint/parser-utils';

import { HtmlParser } from '@markuplint/html-parser';

class AlpineParser extends HtmlParser {
	visitAttr(token: Token, options: Parameters<HtmlParser['visitAttr']>[1]) {
		const attr = super.visitAttr(token, options);

		if (attr.type === 'spread') {
			return attr;
		}

		const name = attr.name.raw;

		switch (name) {
			/**
			 * @see https://alpinejs.dev/directives/data
			 */
			case 'x-data': {
				return {
					...attr,
					isDirective: true as const,
				};
			}
			/**
			 * @see https://alpinejs.dev/directives/init
			 */
			case 'x-init': {
				return {
					...attr,
					isDirective: true as const,
				};
			}
			/**
			 * @see https://alpinejs.dev/directives/show
			 */
			case 'x-show': {
				return {
					...attr,
					isDirective: true as const,
				};
			}
			/**
			 * @see https://alpinejs.dev/directives/text
			 */
			case 'x-text': {
				return {
					...attr,
					isDirective: true as const,
				};
			}
			/**
			 * @see https://alpinejs.dev/directives/html
			 */
			case 'x-html': {
				return {
					...attr,
					isDirective: true as const,
				};
			}
			/**
			 * {@link ./spec.ts} Treat as a normal attribute and allow only in template elements as defined in `spec`.
			 *
			 * @see https://alpinejs.dev/directives/model
			 */
			case 'x-model': {
				return attr;
			}
			/**
			 * @see https://alpinejs.dev/directives/modelable
			 */
			case 'x-modelable': {
				return {
					...attr,
					isDirective: true as const,
				};
			}
			/**
			 * {@link ./spec.ts} Treat as a normal attribute and allow only in template elements as defined in `spec`.
			 *
			 * @see https://alpinejs.dev/directives/for
			 */
			case 'x-for': {
				return attr;
			}
			/**
			 * @see https://alpinejs.dev/directives/effect
			 */
			case 'x-effect': {
				return {
					...attr,
					isDirective: true as const,
				};
			}
			/**
			 * @see https://alpinejs.dev/directives/ignore
			 */
			case 'x-ignore': {
				return {
					...attr,
					valueType: 'boolean' as const,
					isDirective: true as const,
				};
			}
			/**
			 * @see https://alpinejs.dev/directives/ref
			 */
			case 'x-ref': {
				return {
					...attr,
					isDirective: true as const,
				};
			}
			/**
			 * @see https://alpinejs.dev/directives/cloak
			 */
			case 'x-cloak': {
				return {
					...attr,
					valueType: 'boolean' as const,
					isDirective: true as const,
				};
			}
			/**
			 * {@link ./spec.ts} Treat as a normal attribute and allow only in template elements as defined in `spec`.
			 *
			 * @see https://alpinejs.dev/directives/teleport
			 */
			case 'x-teleport': {
				return attr;
			}
			/**
			 * {@link ./spec.ts} Treat as a normal attribute and allow only in template elements as defined in `spec`.
			 *
			 * @see https://alpinejs.dev/directives/if
			 */
			case 'x-if': {
				return attr;
			}
			/**
			 * @see https://alpinejs.dev/directives/id
			 */
			case 'x-id': {
				return {
					...attr,
					isDirective: true as const,
				};
			}
		}

		/**
		 * @see https://alpinejs.dev/directives/bind
		 */
		if (name.startsWith('x-bind:') || name.startsWith(':')) {
			const potentialName = (attr.name.raw.match(/^(x-bind:|:)([^.]+)(?:\.([^.]+))?$/i) ?? [])[2];

			if (!potentialName) {
				return attr;
			}

			return {
				...attr,
				potentialName,
				valueType: 'code' as const,
				isDuplicatable: ['class', 'style'].includes(potentialName),
				isDynamicValue: true as const,
			};
		}

		/**
		 * @see https://alpinejs.dev/directives/on
		 */
		if (name.startsWith('x-on:') || name.startsWith('@')) {
			const potentialName = (attr.name.raw.match(/^(x-on:|@)([^.]+)(\..+)?$/i) ?? [])[2];

			if (!potentialName) {
				return attr;
			}

			return {
				...attr,
				potentialName: `on${potentialName.toLowerCase()}`,
				// TODO: Postpone due to inability to distinguish between custom and native events
				isDirective: true as const,
				isDynamicValue: true as const,
			};
		}

		/**
		 * @see https://alpinejs.dev/directives/transition
		 */
		if (/^x-transition(?:$|:|\.)/.test(name)) {
			return {
				...attr,
				isDirective: true as const,
			};
		}

		return attr;
	}
}

export const parser = new AlpineParser();
