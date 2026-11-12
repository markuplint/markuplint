import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { glob } from '@markuplint/test-tools';
import { extractTranslatorTemplates, findUntranslatedMessages } from '@markuplint/test-tools/translator-templates';
import { i18n } from 'markuplint';
import { describe, expect, test } from 'vitest';

/**
 * Every message a rule builds with `t()` is in Japanese with `locale: 'ja'`.
 *
 * A template that `ja.json` has no sentence for is shown in English, and the keywords inside it
 * are still translated, so the message comes out in two languages. The same goes for a word given
 * for a placeholder that is no keyword. A name (an attribute or an element) is the other half: it
 * is no word of the language, so it goes through `{n*}` and is shown as written. What is checked,
 * and how the key is compared, is in `findUntranslatedMessages` of `@markuplint/test-tools`.
 */
describe('locale ja covers every message of the rules', () => {
	const srcDir = fileURLToPath(new URL('.', import.meta.url));

	test('no template or word is missing from ja.json', async () => {
		const ja = i18n('ja');
		const files = await glob('**/*.ts', {
			cwd: srcDir,
			posix: true,
			ignore: ['**/*.spec.ts', '**/*.spec-d.ts', '**/*.d.ts'],
		});

		let calls = 0;
		const findings: string[] = [];
		for (const file of files.toSorted()) {
			const source = readFileSync(path.join(srcDir, file), 'utf8');
			calls += extractTranslatorTemplates(source).length;
			for (const finding of findUntranslatedMessages(source, ja)) {
				findings.push(`${file}:${finding}`);
			}
		}

		// The rules had 541 templates when this floor was set. A glob that matches nothing, or a
		// rename of `t` that the extractor no longer follows, would pass this spec for the wrong reason
		expect(calls).toBeGreaterThan(480);
		expect(findings).toStrictEqual([]);
	});
});
