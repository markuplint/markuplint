import type { TranslatorLocale } from '@markuplint/test-tools/translator-templates';

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { glob } from '@markuplint/test-tools';
import {
	extractStringConstants,
	extractTranslatorTemplates,
	findUntranslatedMessages,
} from '@markuplint/test-tools/translator-templates';
import { describe, expect, test } from 'vitest';

/**
 * Every message the language server builds with `t()` is in Japanese with a `ja` client.
 *
 * The language server translates with its own `locales/ja.json`, not with the one of
 * `@markuplint/i18n`, so the guard of `@markuplint/rules` does not cover it. Its main messages are
 * constants of `const.ts` that the callers pass to `t()`, so those are read as well.
 */
describe('locale ja covers every message of the language server', () => {
	const srcDir = fileURLToPath(new URL('.', import.meta.url));

	test('no template or word is missing from ja.json', async () => {
		const ja = JSON.parse(readFileSync(new URL('../locales/ja.json', import.meta.url), 'utf8')) as TranslatorLocale;
		const constants = extractStringConstants(readFileSync(path.join(srcDir, 'const.ts'), 'utf8'));
		const files = await glob('**/*.ts', {
			cwd: srcDir,
			posix: true,
			ignore: ['**/*.spec.ts', '**/*.spec-d.ts', '**/*.d.ts'],
		});

		let calls = 0;
		const findings: string[] = [];
		for (const file of files.toSorted()) {
			const source = readFileSync(path.join(srcDir, file), 'utf8');
			calls += extractTranslatorTemplates(source, constants).length;
			for (const finding of findUntranslatedMessages(source, ja, constants)) {
				findings.push(`${file}:${finding}`);
			}
		}

		// The language server had 28 templates when this floor was set. A glob that matches nothing,
		// or a rename of `t` that the extractor no longer follows, would pass this spec for the wrong reason
		expect(calls).toBeGreaterThan(25);
		expect(findings).toStrictEqual([]);
	});
});
