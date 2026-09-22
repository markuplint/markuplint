import { readFileSync } from 'node:fs';

import { describe, expect, test } from 'vitest';

import {
	BUNDLED_PARSER_LOAD_COMPAT_ERROR,
	BUNDLED_PARSER_LOAD_ERROR,
	IMPORT_ASSERTION_COMPAT_WARNING,
	NO_INSTALL_WARNING,
	PARSER_NOT_FOUND_ERROR,
} from './const.js';

const ja = JSON.parse(readFileSync(new URL('../locales/ja.json', import.meta.url), 'utf8')) as {
	sentences: Record<string, string>;
};

const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as {
	contributes: { commands: { command: string; title: string; category: string }[] };
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
	test.each([
		['NO_INSTALL_WARNING', NO_INSTALL_WARNING],
		['IMPORT_ASSERTION_COMPAT_WARNING', IMPORT_ASSERTION_COMPAT_WARNING],
		['PARSER_NOT_FOUND_ERROR', PARSER_NOT_FOUND_ERROR],
		['BUNDLED_PARSER_LOAD_ERROR', BUNDLED_PARSER_LOAD_ERROR],
		['BUNDLED_PARSER_LOAD_COMPAT_ERROR', BUNDLED_PARSER_LOAD_COMPAT_ERROR],
	])('translates %s under the key the translator derives', (_, template) => {
		const key = toSentenceKey(template);
		expect(Object.keys(ja.sentences)).toContain(key);
		expect(placeholders(ja.sentences[key]!)).toEqual(placeholders(key));
	});
});

describe('restart instructions', () => {
	// The command palette shows "<category>: <title>"; the messages spell it out verbatim so a
	// rename in package.json must be mirrored here and in ja.json.
	const restart = manifest.contributes.commands.find(c => c.command === 'markuplint.restartServer')!;
	const displayName = `${restart.category}: ${restart.title}`;

	test.each([
		['BUNDLED_PARSER_LOAD_ERROR', BUNDLED_PARSER_LOAD_ERROR],
		['BUNDLED_PARSER_LOAD_COMPAT_ERROR', BUNDLED_PARSER_LOAD_COMPAT_ERROR],
	])('%s names the restart command as the command palette shows it', (_, template) => {
		expect(template).toContain(`"${displayName}"`);
		expect(ja.sentences[toSentenceKey(template)]).toContain(`「${displayName}」`);
	});
});
