import { HtmlParser } from '@markuplint/html-parser';

/**
 * Parser for PHP templates that extends the standard HTML parser.
 *
 * Configures the HTML parser to recognize PHP tag variants as opaque blocks:
 * - `<?php ... ?>` (standard PHP code blocks; also matches unclosed tags at EOF)
 * - `<?= ... ?>` (short echo / output tags)
 * - `<? ... ?>` (short open tags; also matches unclosed tags at EOF)
 */
class PHPParser extends HtmlParser {
	constructor() {
		super({
			ignoreTags: [
				{
					type: 'php-tag',
					start: '<?php',
					end: /\?>|$/,
				},
				{
					type: 'php-echo',
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
