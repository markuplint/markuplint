import type { Token } from '@markuplint/parser-utils';

import { HtmlParser } from '@markuplint/html-parser';

class HtmxParser extends HtmlParser {
	visitAttr(token: Token, options: Parameters<HtmlParser['visitAttr']>[1]) {
		const attr = super.visitAttr(token, options);

		if (attr.type === 'spread') {
			return attr;
		}

		const name = attr.name.raw;

		/**
		 * @see https://htmx.org/attributes/hx-on/
		 */
		if (name.startsWith('hx-on:') || name.startsWith('hx-on-')) {
			const matched = attr.name.raw.match(
				/^hx-on(?<separator>:|-)(?:(?<nativeEvent>[a-z]+)|(?:htmx)?\k<separator>(?<htmxEvent>.+))$/i,
			);

			if (!matched) {
				return attr;
			}

			const { nativeEvent, htmxEvent } = matched.groups || {};

			if (htmxEvent) {
				// @see https://htmx.org/reference/#events
				return {
					...attr,
					potentialName: `hx-on:htmx:${htmxEvent.toLowerCase()}`,
					isDirective: true as const,
					isDynamicValue: true as const,
				};
			}

			if (nativeEvent) {
				return {
					...attr,
					potentialName: `on${nativeEvent.toLowerCase()}`,
					isDirective: true as const,
					isDynamicValue: true as const,
				};
			}

			return {
				...attr,
				isDirective: true as const,
				isDynamicValue: true as const,
			};
		}

		return attr;
	}
}

export const parser = new HtmxParser();
