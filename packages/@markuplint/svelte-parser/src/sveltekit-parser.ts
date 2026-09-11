import { HtmlParser } from '@markuplint/html-parser';

/**
 * Parser for SvelteKit app template files (e.g., `app.html`).
 * Extends the standard HTML parser to handle SvelteKit placeholder tags
 * such as `%sveltekit.head%` and `%sveltekit.body%`, which are treated
 * as opaque preprocessor-specific blocks.
 *
 * Unlike `SvelteParser`, the app template is plain HTML whose `%sveltekit.*%`
 * placeholders are replaced by SvelteKit at build time, so the template engine
 * parser pattern (extending `HtmlParser` with `ignoreTags`) is the correct
 * architectural choice and `svelte/compiler` is intentionally not involved.
 */
class SvelteKitTemplateParser extends HtmlParser {
	constructor() {
		super({
			ignoreTags: [
				{
					type: 'sveltekit-placeholder',
					start: '%sveltekit.',
					end: '%',
				},
			],
		});
	}
}

export const parser = new SvelteKitTemplateParser();
