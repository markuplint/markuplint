import { HtmlParser } from '@markuplint/html-parser';

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

export const parser = new PHPParser();
