import type { Token } from '@markuplint/parser-utils';

import { HtmlParser } from '@markuplint/html-parser';

/**
 * Parser for htmx-enhanced HTML that extends the standard HTML parser.
 *
 * Recognizes `hx-on:` and `hx-on-` event handler attributes and maps them to
 * their canonical forms, distinguishing between native DOM events and
 * htmx-specific lifecycle events.
 */
class HtmxParser extends HtmlParser {
	/**
	 * Visits an attribute token and applies htmx-specific classification.
	 *
	 * Parses `hx-on:` and `hx-on-` shorthand attributes to determine whether
	 * they reference a native DOM event or an htmx lifecycle event. Native
	 * events are mapped to their `on*` canonical name; htmx events are
	 * normalized to the `hx-on:htmx:*` form. All matched attributes are
	 * marked as directives with dynamic values.
	 *
	 * @param token - The raw attribute token containing text and position information
	 * @param options - Controls quoting behavior, value types, and the initial parser state
	 * @returns The attribute AST node enriched with htmx event handler metadata
	 */
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

/**
 * Singleton htmx parser instance for use by the markuplint engine.
 */
export const parser = new HtmxParser();
