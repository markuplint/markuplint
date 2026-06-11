import { HtmlParser } from '@markuplint/html-parser';

/**
 * Parser for PHP templates that extends the standard HTML parser.
 *
 * Configures the HTML parser to recognize PHP tag variants as opaque blocks:
 * - `<?php ... ?>` (standard PHP code blocks; also matches unclosed tags at EOF)
 * - `<?= ... ?>` (short echo / output tags)
 * - `<? ... ?>` (short open tags; also matches unclosed tags at EOF)
 *
 * PHP code is never analyzed; only the start/end delimiters are matched, so a
 * `?>` inside a PHP string literal or comment terminates the block early.
 *
 * Known limitation: PHP expressions inside unquoted attribute values are not
 * supported. This limitation is shared by all template engine parsers.
 *
 * @see https://github.com/markuplint/markuplint/issues/240
 * @see https://markuplint.dev/docs/guides/besides-html
 */
class PHPParser extends HtmlParser {
	constructor() {
		super({
			// Ordered from most specific to least specific: the generic `<?` pattern
			// (php-short-tag) must remain last, otherwise it would match before
			// `<?php` and `<?=` and misclassify those tags.
			ignoreTags: [
				{
					type: 'php-tag',
					start: '<?php',
					end: /\?>|$/,
				},
				{
					type: 'php-echo',
					// Plain `?>` without the `|$` EOF fallback: echo tags are always
					// expected to be closed within the template.
					start: '<?=',
					end: '?>',
				},
				{
					type: 'php-short-tag',
					start: '<?',
					end: /\?>|$/,
				},
			],
		});
	}
}

/**
 * Singleton PHP parser instance for use by the markuplint engine.
 */
export const parser = new PHPParser();
