import { readFileSync } from 'node:fs';

import { describe, expect, test } from 'vitest';

import { BUNDLED_PRETENDERS_NOT_FOUND_ERROR } from './const.js';

const ja = JSON.parse(readFileSync(new URL('../locales/ja.json', import.meta.url), 'utf8')) as {
	sentences: Record<string, string>;
};

// Mirrors how @markuplint/i18n derives the sentence key: no-translate marks stripped, then lowercased.
// A key that drifts from the template is not an error at runtime — `t()` silently falls back to English.
function toSentenceKey(template: string): string {
	return template.replaceAll(/(?<=\{\d+)\*(?=\})/g, '').toLowerCase();
}

function placeholders(text: string): string[] {
	return [...text.matchAll(/\{(\d+)\}/g)].map(m => m[1]!).toSorted();
}

describe('locales/ja.json', () => {
	test('translates BUNDLED_PRETENDERS_NOT_FOUND_ERROR under the key the translator derives', () => {
		const key = toSentenceKey(BUNDLED_PRETENDERS_NOT_FOUND_ERROR);

		expect(Object.keys(ja.sentences)).toContain(key);
		expect(placeholders(ja.sentences[key]!)).toEqual(placeholders(key));
	});
});
