import assert from 'node:assert';

import { suite, test } from 'mocha';
import * as vscode from 'vscode';

suite('Config Tests', () => {
	test('config', () => {
		const config = vscode.workspace.getConfiguration('markuplint');

		assert.strictEqual(config.get('debug'), true);
		assert.strictEqual(config.get('enable'), true);
		assert.deepStrictEqual(config.get('defaultConfig'), {
			extends: ['markuplint:recommended'],
		});
		assert.deepStrictEqual(config.get('hover.accessibility.enable'), true);
		assert.strictEqual(config.get('hover.accessibility.ariaVersion'), '');
		assert.deepStrictEqual(config.get('targetLanguages'), [
			'astro',
			'ejs',
			'haml',
			'handlebars',
			'html',
			'jade',
			'javascript',
			'javascriptreact',
			'jstl',
			'liquid',
			'mustache',
			'nunjucks',
			'php',
			'ruby',
			'smarty',
			'svelte',
			'typescript',
			'typescriptreact',
			'vue',
		]);
	});

	test('per-language scoped config resolves defaults', () => {
		const languages = ['html', 'javascript', 'vue'];

		for (const languageId of languages) {
			const langConfig = vscode.workspace.getConfiguration('markuplint', { languageId });

			const config = {
				enable: langConfig.get('enable'),
				debug: langConfig.get('debug'),
				defaultConfig: langConfig.get('defaultConfig'),
				hover: {
					accessibility: {
						enable: langConfig.get('hover.accessibility.enable'),
						ariaVersion: langConfig.get('hover.accessibility.ariaVersion'),
					},
				},
			};

			assert.deepStrictEqual(
				config,
				{
					enable: true,
					debug: true,
					defaultConfig: {
						extends: ['markuplint:recommended'],
					},
					hover: {
						accessibility: {
							enable: true,
							ariaVersion: '',
						},
					},
				},
				`Config for language "${languageId}" should have all defaults resolved`,
			);
		}
	});
});
